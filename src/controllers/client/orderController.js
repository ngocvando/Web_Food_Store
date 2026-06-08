const db = require('../../config/db');
const { getCartItems } = require('../../routes/client/cartRoutes');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');
const { buildVietQrUrl, makePaymentReference } = require('../../services/vietqr');
const { calculateCartPricing } = require('../../services/pricing');
const { sendOrderConfirmation, isMailConfigured } = require('../../services/mailService');
const { collapseSpaces, normalizePhone, validatePhoneField, validateFullNameField, normalizeVoucherCode } = require('../../services/validators');

function clean(value) {
    return (value || '').toString().trim();
}

function toNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function splitSavedAddress(address) {
    const result = { address_detail: '', ward: '', district: '', province: '' };
    if (!address) return result;

    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
        result.province = parts.pop() || '';
        result.district = parts.pop() || '';
        result.ward = parts.pop() || '';
        result.address_detail = parts.join(', ') || '';
    } else {
        result.address_detail = address;
    }
    return result;
}

function makeAddressSignature(address_detail, ward, district, province) {
    return [address_detail, ward, district, province]
        .map(clean)
        .filter(Boolean)
        .join(', ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}


function wantsJson(req) {
    return req.xhr || (req.headers.accept || '').includes('application/json') || req.body.ajax === '1';
}

function pricingJson(pricing, extra = {}) {
    return {
        success: !pricing.couponError,
        couponCode: pricing.couponCode || '',
        couponType: pricing.coupon ? (pricing.coupon.discount_type || '').toLowerCase() : '',
        couponValue: pricing.coupon ? Number(pricing.coupon.discount_value || 0) : 0,
        subtotal: Number(pricing.subtotal || 0),
        shippingAmount: Number(pricing.shippingAmount || 0),
        discountAmount: Number(pricing.discountAmount || 0),
        shippingDiscountAmount: Number(pricing.shippingDiscountAmount || 0),
        distanceKm: Number(pricing.distanceKm || 0),
        shippingMessage: pricing.shippingMessage || '',
        total: Number(pricing.total || 0),
        deliveryBlocked: !!pricing.deliveryBlocked,
        shippingPending: !!pricing.shippingPending,
        couponError: pricing.couponError || null,
        ...extra
    };
}

async function getSettings() {
    const [settingsRows] = await db.execute('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    settingsRows.forEach(r => settings[r.setting_key] = r.setting_value);
    return settings;
}

async function getActiveVouchers() {
    await ensureOrderReviewSchema();
    const [rows] = await db.execute(`
        SELECT code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, start_date, end_date
        FROM discount_codes
        WHERE is_active = 1
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
          AND deleted_at IS NULL
          AND (usage_limit IS NULL OR usage_limit = 0 OR used_count < usage_limit)
        ORDER BY end_date IS NULL, end_date ASC, discount_id DESC
        LIMIT 8
    `);
    return rows;
}


async function validateCartAvailability(cart) {
    for (const item of cart) {
        if (Number(item.is_combo) === 1) {
            const [[combo]] = await db.execute(`
                SELECT co.combo_id
                FROM combos co
                WHERE co.combo_id = ?
                  AND co.is_available = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM combo_items ci
                      JOIN dishes d ON ci.dish_id = d.dish_id
                      WHERE ci.combo_id = co.combo_id AND d.is_available = 0
                  )`, [item.combo_id]);
            if (!combo) return `Combo "${item.dish_name}" hiện đã tạm ngưng vì có món bên trong không còn bán. Vui lòng xóa combo khỏi giỏ hàng.`;
        } else {
            const [[dish]] = await db.execute(
                'SELECT dish_id FROM dishes WHERE dish_id = ? AND is_available = 1',
                [item.dish_id]
            );
            if (!dish) return `Món "${item.dish_name}" hiện đã tạm ngưng. Vui lòng xóa món khỏi giỏ hàng.`;
        }
    }
    return null;
}

async function buildCheckoutData(userId, cart, error = null, old = {}) {
    const [users] = await db.execute(
        'SELECT full_name, phone, address FROM users WHERE user_id = ?',
        [userId]
    );
    const userInfo = users[0] || {};
    const savedAddress = splitSavedAddress(userInfo.address);
    const settings = await getSettings();
    const activeVouchers = await getActiveVouchers();
    const pricing = await calculateCartPricing(cart, old.coupon_code || null, {
        distance_km: old.distance_km || old.delivery_distance_km,
        lat: old.delivery_lat,
        lng: old.delivery_lng,
        userId
    });
    const total = pricing.total;

    return {
        cart,
        total,
        pricing,
        userInfo,
        savedAddress,
        hasSavedAddress: !!clean(userInfo.address),
        qrImage: settings.qr_image || null,
        vietqrPreviewUrl: buildVietQrUrl(settings, total, 'COMQUE TAM TINH'),
        settings,
        activeVouchers,
        error,
        old,
        couponMessage: null,
        couponError: null
    };
}


async function getOrderItems(orderId) {
    const [items] = await db.execute(`
        SELECT oi.*,
               CASE WHEN oi.is_combo = 1 THEN co.combo_name ELSE d.dish_name END AS dish_name,
               CASE WHEN oi.is_combo = 1 THEN co.image_url ELSE d.image_url END AS image_url
        FROM order_items oi
        LEFT JOIN dishes d ON oi.dish_id = d.dish_id
        LEFT JOIN combos co ON oi.combo_id = co.combo_id
        WHERE oi.order_id = ?`,
        [orderId]
    );
    return items;
}

async function getOrderForUser(orderId, userId) {
    const [orders] = await db.execute(
        `SELECT o.*, u.full_name, u.email
         FROM orders o
         JOIN users u ON o.user_id = u.user_id
         WHERE o.order_id = ? AND o.user_id = ?`,
        [orderId, userId]
    );
    return orders[0];
}

async function sendOrderMailSafely(order, items) {
    try {
        if (isMailConfigured() && order && order.email) {
            await sendOrderConfirmation(order.email, order, items);
        }
    } catch (mailError) {
        console.error('Không thể gửi email xác nhận đơn hàng:', mailError.message);
    }
}

const orderController = {
    getCheckout: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const cart = await getCartItems(req.session.userId);
        if (cart.length === 0) return res.redirect('/cart');
        try {
            await ensureOrderReviewSchema();
            const data = await buildCheckoutData(req.session.userId, cart, null, { coupon_code: req.session.couponCode || '' });
            data.couponMessage = req.session.couponMessage || null;
            data.couponError = req.session.couponError || data.pricing.couponError || null;
            delete req.session.couponMessage;
            delete req.session.couponError;
            res.render('client/pages/checkout', data);
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi tải trang checkout');
        }
    },

    applyCoupon: async (req, res) => {
        if (!req.session.userId) {
            if (wantsJson(req)) return res.status(401).json({ success: false, redirect: '/login', message: 'Bạn cần đăng nhập.' });
            return res.redirect('/login');
        }
        try {
            const cart = await getCartItems(req.session.userId);
            const code = (req.body.coupon_code || '').toString().trim().toUpperCase();
            const delivery = {
                distance_km: req.body.distance_km || req.body.delivery_distance_km,
                lat: req.body.delivery_lat,
                lng: req.body.delivery_lng,
                userId: req.session.userId
            };

            if (!code) {
                delete req.session.couponCode;
                delete req.session.couponMessage;
                req.session.couponError = 'Vui lòng nhập mã voucher.';
                const pricing = await calculateCartPricing(cart, null, delivery);
                if (wantsJson(req)) return res.json(pricingJson(pricing, { success: false, message: req.session.couponError }));
                return res.redirect('/checkout');
            }

            const pricing = await calculateCartPricing(cart, code, delivery);
            if (pricing.couponError) {
                delete req.session.couponCode;
                delete req.session.couponMessage;
                req.session.couponError = pricing.couponError;
                if (wantsJson(req)) return res.json(pricingJson(pricing, { success: false, message: pricing.couponError }));
            } else {
                req.session.couponCode = pricing.couponCode;
                delete req.session.couponError;
                const type = (pricing.coupon?.discount_type || '').toLowerCase();
                if (type === 'freeship') {
                    req.session.couponMessage = pricing.shippingPending
                        ? `Đã áp dụng voucher ${pricing.couponCode}. Voucher sẽ giảm phí giao hàng sau khi tính ship.`
                        : `Đã áp dụng voucher ${pricing.couponCode}, giảm ${Number(pricing.shippingDiscountAmount || 0).toLocaleString('vi-VN')} ₫ phí ship.`;
                } else {
                    req.session.couponMessage = `Đã áp dụng voucher ${pricing.couponCode}, giảm ${Number(pricing.discountAmount || 0).toLocaleString('vi-VN')} ₫ tiền món.`;
                }
                if (wantsJson(req)) return res.json(pricingJson(pricing, { success: true, message: req.session.couponMessage }));
            }
            res.redirect('/checkout');
        } catch (error) {
            console.error('Lỗi áp dụng voucher ở checkout:', error);
            req.session.couponError = 'Không thể áp dụng voucher.';
            if (wantsJson(req)) return res.status(500).json({ success: false, message: req.session.couponError });
            res.redirect('/checkout');
        }
    },

    removeCoupon: async (req, res) => {
        if (!req.session.userId) {
            if (wantsJson(req)) return res.status(401).json({ success: false, redirect: '/login', message: 'Bạn cần đăng nhập.' });
            return res.redirect('/login');
        }
        try {
            const cart = await getCartItems(req.session.userId);
            const delivery = {
                distance_km: req.body.distance_km || req.body.delivery_distance_km,
                lat: req.body.delivery_lat,
                lng: req.body.delivery_lng,
                userId: req.session.userId
            };
            delete req.session.couponCode;
            req.session.couponMessage = 'Đã bỏ voucher.';
            const pricing = await calculateCartPricing(cart, null, delivery);
            if (wantsJson(req)) return res.json(pricingJson(pricing, { success: true, message: req.session.couponMessage }));
            res.redirect('/checkout');
        } catch (error) {
            console.error('Lỗi bỏ voucher ở checkout:', error);
            if (wantsJson(req)) return res.status(500).json({ success: false, message: 'Không thể bỏ voucher.' });
            res.redirect('/checkout');
        }
    },

    postOrder: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const cart = await getCartItems(req.session.userId);
        if (cart.length === 0) return res.redirect('/cart');
        const conn = await db.getConnection();
        try {
            await ensureOrderReviewSchema();
            const receiver_name = collapseSpaces(req.body.receiver_name);
            const phone = normalizePhone(req.body.phone);
            const address_detail = clean(req.body.address_detail);
            const ward = clean(req.body.ward);
            const district = clean(req.body.district);
            const province = clean(req.body.province);
            const note = clean(req.body.note);
            const payment_method = clean(req.body.payment_method) || 'COD';
            const couponCode = req.session.couponCode || normalizeVoucherCode(req.body.coupon_code);
            const deliveryLat = toNumber(req.body.delivery_lat);
            const deliveryLng = toNumber(req.body.delivery_lng);
            const deliveryDistanceKm = toNumber(req.body.distance_km || req.body.delivery_distance_km);
            const submittedAddressSignature = clean(req.body.address_signature);
            const currentAddressSignature = makeAddressSignature(address_detail, ward, district, province);
            const pricing = await calculateCartPricing(cart, couponCode, {
                distance_km: deliveryDistanceKm,
                lat: deliveryLat,
                lng: deliveryLng,
                userId: req.session.userId
            });
            const nameError = validateFullNameField(receiver_name);
            const phoneError = validatePhoneField(phone);
            if (nameError || phoneError) {
                const data = await buildCheckoutData(req.session.userId, cart, nameError || phoneError, { ...req.body, receiver_name, phone });
                return res.status(400).render('client/pages/checkout', data);
            }
            if (!deliveryDistanceKm || !submittedAddressSignature || submittedAddressSignature !== currentAddressSignature) {
                const data = await buildCheckoutData(
                    req.session.userId,
                    cart,
                    'Vui lòng chọn địa chỉ hợp lệ từ Google Maps hoặc bấm “Tính phí ship” để tính lại phí giao hàng trước khi đặt hàng.',
                    req.body
                );
                return res.status(400).render('client/pages/checkout', data);
            }
            if (pricing.deliveryBlocked) {
                const data = await buildCheckoutData(req.session.userId, cart, pricing.shippingMessage, req.body);
                return res.status(400).render('client/pages/checkout', data);
            }
            if (pricing.shippingPending) {
                const data = await buildCheckoutData(req.session.userId, cart, 'Vui lòng nhập địa chỉ và bấm “Tính phí ship” trước khi đặt hàng.', req.body);
                return res.status(400).render('client/pages/checkout', data);
            }
            if (pricing.couponError) {
                delete req.session.couponCode;
                const data = await buildCheckoutData(req.session.userId, cart, pricing.couponError, req.body);
                return res.status(400).render('client/pages/checkout', data);
            }

            const cartAvailabilityError = await validateCartAvailability(cart);
            if (cartAvailabilityError) {
                const data = await buildCheckoutData(req.session.userId, cart, cartAvailabilityError, req.body);
                return res.status(400).render('client/pages/checkout', data);
            }

            if (!receiver_name || !phone || !address_detail || !ward || !district || !province) {
                const data = await buildCheckoutData(
                    req.session.userId,
                    cart,
                    'Vui lòng nhập đầy đủ họ tên, số điện thoại, số nhà/đường, phường/xã, quận/huyện và tỉnh/thành phố.',
                    req.body
                );
                return res.status(400).render('client/pages/checkout', data);
            }

            const delivery_address = `${address_detail}, ${ward}, ${district}, ${province}`;
            const total = pricing.total;
            const payment_status = payment_method === 'Banking' ? 'WaitingConfirm' : 'COD';

            if (payment_method === 'Banking') {
                const settings = await getSettings();
                if (!buildVietQrUrl(settings, total, 'COMQUE TAM TINH')) {
                    const data = await buildCheckoutData(
                        req.session.userId,
                        cart,
                        'Nhà hàng chưa cấu hình đầy đủ thông tin VietQR. Vui lòng chọn COD hoặc liên hệ nhân viên.',
                        req.body
                    );
                    return res.status(400).render('client/pages/checkout', data);
                }
            }
            let payment_reference = null;

            await conn.beginTransaction();

            // Lưu lại địa chỉ đầy đủ vừa nhập vào hồ sơ người dùng để lần đặt sau tự động dùng lại.
            // Người dùng vẫn có thể sửa các ô địa chỉ ở trang checkout; địa chỉ mới sẽ ghi đè địa chỉ cũ.
            await conn.execute(
                'UPDATE users SET address = ? WHERE user_id = ?',
                [delivery_address, req.session.userId]
            );

            const [result] = await conn.execute(
                `INSERT INTO orders (user_id, total_amount, note, receiver_name, delivery_phone, delivery_address, payment_method, payment_status, payment_reference, subtotal_amount, shipping_fee, discount_code, discount_amount, shipping_discount_amount, distance_km, delivery_lat, delivery_lng)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.session.userId, total, note, receiver_name, phone, delivery_address, payment_method, payment_status, payment_reference, pricing.subtotal, pricing.shippingAmount, pricing.couponCode || null, pricing.discountAmount, pricing.shippingDiscountAmount || 0, pricing.distanceKm || 0, deliveryLat || null, deliveryLng || null]
            );
            const orderId = result.insertId;

            if (payment_method === 'Banking') {
                payment_reference = makePaymentReference(orderId);
                await conn.execute(
                    'UPDATE orders SET payment_reference = ? WHERE order_id = ?',
                    [payment_reference, orderId]
                );
            }

            for (const item of cart) {
                await conn.execute(
                    'INSERT INTO order_items (order_id, dish_id, quantity, price_at_time, combo_id, is_combo) VALUES (?, ?, ?, ?, ?, ?)',
                    [orderId, item.is_combo ? null : item.dish_id, item.quantity, item.price, item.is_combo ? item.combo_id : null, item.is_combo ? 1 : 0]
                );
            }
            if (pricing.couponCode && pricing.coupon) {
                await conn.execute('UPDATE discount_codes SET used_count = used_count + 1 WHERE discount_id = ?', [pricing.coupon.discount_id]);
                await conn.execute(
                    'INSERT IGNORE INTO voucher_usages (discount_id, user_id, order_id) VALUES (?, ?, ?)',
                    [pricing.coupon.discount_id, req.session.userId, orderId]
                );
                delete req.session.couponCode;
            }
            await conn.execute('DELETE ci FROM cart_items ci JOIN carts c ON ci.cart_id = c.cart_id WHERE c.user_id = ?', [req.session.userId]);
            await conn.commit();

            // Gửi email xác nhận đặt hàng. Nếu cấu hình email lỗi, đơn vẫn được tạo thành công.
            const [mailOrders] = await db.execute(
                `SELECT o.*, u.email, u.full_name
                 FROM orders o
                 JOIN users u ON o.user_id = u.user_id
                 WHERE o.order_id = ?`,
                [orderId]
            );
            const mailItems = await getOrderItems(orderId);
            await sendOrderMailSafely(mailOrders[0], mailItems);

            res.redirect('/order-success?id=' + orderId);
        } catch (error) {
            await conn.rollback();
            console.error('Lỗi đặt hàng:', error);
            res.status(500).send('Lỗi khi đặt hàng: ' + error.message);
        } finally {
            conn.release();
        }
    },

    getOrderSuccess: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const orderId = req.query.id;
        try {
            const [orders] = await db.execute(
                'SELECT o.*, u.full_name FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_id = ? AND o.user_id = ?',
                [orderId, req.session.userId]
            );
            if (orders.length === 0) return res.status(403).send('Bạn không có quyền xem đơn hàng này');
            const order = orders[0];
            if (order.payment_method === 'Banking' && !order.payment_reference) {
                order.payment_reference = makePaymentReference(order.order_id);
            }
            const settings = await getSettings();
            const vietqrUrl = order.payment_method === 'Banking'
                ? buildVietQrUrl(settings, order.total_amount, order.payment_reference || makePaymentReference(order.order_id))
                : null;
            res.render('client/pages/order-success', { orderId, order, settings, vietqrUrl });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi tải trang thành công đơn hàng');
        }
    },

    getMyOrders: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        try {
            await ensureOrderReviewSchema();
            const [orders] = await db.execute(
                'SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.order_date DESC',
                [req.session.userId]
            );
            for (let order of orders) {
                const [items] = await db.execute(`
                    SELECT oi.*,
                           CASE WHEN oi.is_combo = 1 THEN co.combo_name ELSE d.dish_name END AS dish_name,
                           CASE WHEN oi.is_combo = 1 THEN co.image_url ELSE d.image_url END AS image_url
                    FROM order_items oi
                    LEFT JOIN dishes d ON oi.dish_id = d.dish_id
                    LEFT JOIN combos co ON oi.combo_id = co.combo_id
                    WHERE oi.order_id = ?`, [order.order_id]);
                order.items = items;

                // Mỗi đơn hàng chỉ có 1 đánh giá tổng thể.
                const [reviews] = await db.execute(`
                    SELECT review_id, rating AS user_rating, comment AS user_comment, updated_at AS review_updated_at
                    FROM reviews
                    WHERE user_id = ? AND order_id = ?
                    ORDER BY review_id DESC
                    LIMIT 1`, [req.session.userId, order.order_id]);
                order.review = reviews[0] || null;
            }
            res.render('client/pages/my-orders', {
                orders,
                reviewed: req.query.reviewed === '1',
                review_error: req.query.review_error || null
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi tải lịch sử đơn hàng');
        }
    },

    printInvoice: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        if (Number(req.session.roleId) !== 3) return res.status(403).send('Chỉ khách hàng mới có quyền in hóa đơn cá nhân.');
        try {
            const orderId = req.params.id;
            const order = await getOrderForUser(orderId, req.session.userId);
            if (!order) return res.status(404).send('Không tìm thấy hóa đơn hoặc bạn không có quyền xem.');
            const items = await getOrderItems(orderId);
            const settings = await getSettings();
            res.render('client/pages/invoice-print', { order, items, settings });
        } catch (error) {
            console.error('Lỗi in hóa đơn:', error);
            res.status(500).send('Không thể tải hóa đơn.');
        }
    },

    cancelOrder: async (req, res) => {
        if (!req.session.userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        const { orderId } = req.body;
        try {
            const [orders] = await db.execute(
                'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
                [orderId, req.session.userId]
            );
            if (orders.length === 0) return res.status(403).json({ success: false, message: 'Không tìm thấy đơn hàng' });
            if (orders[0].order_status !== 'Pending') {
                return res.json({ success: false, message: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận' });
            }
            await db.execute("UPDATE orders SET order_status = 'Cancelled' WHERE order_id = ?", [orderId]);
            res.json({ success: true, message: 'Đã hủy đơn hàng thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi hủy đơn' });
        }
    }
};

module.exports = orderController;
