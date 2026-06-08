const db = require('../config/db');
const { ensureOrderReviewSchema } = require('./schemaHelper');

function toNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function normalizeCode(code) {
    return (code || '').toString().trim().toUpperCase();
}

function roundMoney(value) {
    return Math.max(0, Math.round(toNumber(value)));
}

function haversineKm(lat1, lon1, lat2, lon2) {
    lat1 = toNumber(lat1); lon1 = toNumber(lon1); lat2 = toNumber(lat2); lon2 = toNumber(lon2);
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getPricingSettings() {
    const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);

    return {
        // Mô hình GrabFood: phí cơ bản cho vài km đầu, sau đó cộng theo từng km phát sinh.
        shippingBaseFee: Math.max(0, toNumber(settings.shipping_base_fee || settings.shipping_fee || 15000)),
        shippingBaseKm: Math.max(0.1, toNumber(settings.shipping_base_km || 3)),
        shippingPerKm: Math.max(0, toNumber(settings.shipping_per_km || 3000)),
        shippingMaxKm: Math.max(0, toNumber(settings.shipping_max_km || 20)),
        shopLat: toNumber(settings.shop_lat || 20.64637),
        shopLng: toNumber(settings.shop_lng || 106.05112),
        shopAddress: settings.shop_address || 'Cơm Quê, Hưng Yên',
        settings
    };
}

function calculateGrabShipping(distanceKm, options) {
    const distance = toNumber(distanceKm);
    if (!distance || distance <= 0) {
        return { shippingAmount: 0, distanceKm: 0, shippingPending: true, deliveryBlocked: false, shippingMessage: 'Phí ship sẽ được tính sau khi nhập địa chỉ giao hàng.' };
    }
    if (options.shippingMaxKm > 0 && distance > options.shippingMaxKm) {
        return {
            shippingAmount: 0,
            distanceKm: Number(distance.toFixed(2)),
            shippingPending: false,
            deliveryBlocked: true,
            shippingMessage: `Địa chỉ cách cửa hàng ${distance.toFixed(1)} km, vượt phạm vi giao hàng ${options.shippingMaxKm} km.`
        };
    }
    const extraKm = Math.max(0, Math.ceil(distance - options.shippingBaseKm));
    const shippingAmount = roundMoney(options.shippingBaseFee + extraKm * options.shippingPerKm);
    return {
        shippingAmount,
        distanceKm: Number(distance.toFixed(2)),
        shippingPending: false,
        deliveryBlocked: false,
        shippingMessage: `Khoảng cách ${distance.toFixed(1)} km - Phí giao hàng ${shippingAmount.toLocaleString('vi-VN')}đ.`
    };
}

function calculateDistanceFromCoords(deliveryLat, deliveryLng, pricingSettings) {
    return haversineKm(pricingSettings.shopLat, pricingSettings.shopLng, deliveryLat, deliveryLng);
}

async function getDiscountByCode(code) {
    await ensureOrderReviewSchema();
    const normalized = normalizeCode(code);
    if (!normalized) return null;

    const [rows] = await db.execute(
        `SELECT * FROM discount_codes
         WHERE UPPER(code) = ?
           AND is_active = 1
           AND deleted_at IS NULL
           AND (start_date IS NULL OR start_date <= NOW())
           AND (end_date IS NULL OR end_date >= NOW())
         LIMIT 1`,
        [normalized]
    );
    return rows[0] || null;
}

function calculateDiscountAmount(coupon, subtotal) {
    if (!coupon || subtotal <= 0) return 0;
    const minOrder = toNumber(coupon.min_order_amount);
    if (subtotal < minOrder) return 0;

    let amount = 0;
    const dtype=(coupon.discount_type||'').toLowerCase();
    if (dtype === 'percent' || dtype==='percentage') {
        amount = Math.floor(subtotal * toNumber(coupon.discount_value) / 100);
        const maxDiscount = toNumber(coupon.max_discount_amount);
        if (maxDiscount > 0) amount = Math.min(amount, maxDiscount);
    } else if (dtype === 'fixed') {
        amount = toNumber(coupon.discount_value);
    } else {
        amount = 0;
    }
    return Math.max(0, Math.min(amount, subtotal));
}

async function calculateCartPricing(cart, couponCode = null, delivery = {}) {
    const subtotal = cart.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0);
    const shipSettings = await getPricingSettings();

    let distanceKm = toNumber(delivery.distance_km || delivery.distanceKm);
    if ((!distanceKm || distanceKm <= 0) && delivery.lat && delivery.lng) {
        const d = calculateDistanceFromCoords(delivery.lat, delivery.lng, shipSettings);
        if (d) distanceKm = d;
    }
    const shipping = calculateGrabShipping(distanceKm, shipSettings);

    let coupon = null;
    let couponError = null;
    const normalizedCode = normalizeCode(couponCode);
    if (normalizedCode) {
        coupon = await getDiscountByCode(normalizedCode);
        if (!coupon) {
            couponError = 'Mã giảm giá không tồn tại hoặc đã hết hạn.';
        } else if (toNumber(coupon.usage_limit) > 0 && toNumber(coupon.used_count) >= toNumber(coupon.usage_limit)) {
            couponError = 'Mã giảm giá đã hết lượt sử dụng.';
            coupon = null;
        } else if (delivery.userId) {
            const [usedRows] = await db.execute(
                'SELECT usage_id FROM voucher_usages WHERE discount_id = ? AND user_id = ? LIMIT 1',
                [coupon.discount_id, delivery.userId]
            );
            if (usedRows.length > 0) {
                couponError = 'Bạn đã sử dụng voucher này trước đó.';
                coupon = null;
            } else if (subtotal < toNumber(coupon.min_order_amount)) {
                couponError = `Mã này chỉ áp dụng cho đơn từ ${toNumber(coupon.min_order_amount).toLocaleString('vi-VN')} ₫.`;
            }
        } else if (subtotal < toNumber(coupon.min_order_amount)) {
            couponError = `Mã này chỉ áp dụng cho đơn từ ${toNumber(coupon.min_order_amount).toLocaleString('vi-VN')} ₫.`;
        }
    }

    let discountAmount = 0;
    let shippingDiscountAmount = 0;
    if (coupon && !couponError) {
        const type = (coupon.discount_type || '').toLowerCase();
        if (type === 'freeship') {
            shippingDiscountAmount = Math.min(shipping.shippingAmount, toNumber(coupon.discount_value) || shipping.shippingAmount);
        } else {
            discountAmount = calculateDiscountAmount(coupon, subtotal);
        }
    }
    const total = Math.max(0, subtotal - discountAmount + shipping.shippingAmount - shippingDiscountAmount);

    return {
        subtotal,
        shippingAmount: shipping.shippingAmount,
        shippingBaseFee: shipSettings.shippingBaseFee,
        shippingBaseKm: shipSettings.shippingBaseKm,
        shippingPerKm: shipSettings.shippingPerKm,
        shippingMaxKm: shipSettings.shippingMaxKm,
        shippingMessage: shipping.shippingMessage,
        shippingPending: shipping.shippingPending,
        deliveryBlocked: shipping.deliveryBlocked,
        distanceKm: shipping.distanceKm,
        shopLat: shipSettings.shopLat,
        shopLng: shipSettings.shopLng,
        shopAddress: shipSettings.shopAddress,
        discountAmount,
        shippingDiscountAmount,
        coupon,
        couponCode: coupon && !couponError ? coupon.code : '',
        couponError,
        total,
        settings: shipSettings.settings
    };
}

module.exports = {
    calculateCartPricing,
    calculateGrabShipping,
    calculateDistanceFromCoords,
    getPricingSettings,
    normalizeCode
};
