const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');
const { calculateCartPricing, normalizeCode } = require('../../services/pricing');

const requireLogin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, redirect: '/login' });
    }
    if (Number(req.session.roleId) !== 3) {
        return res.status(403).json({ success: false, message: 'Chỉ tài khoản khách hàng mới được sử dụng giỏ hàng.' });
    }
    next();
};

async function ensureCart(userId) {
    const [carts] = await db.execute('SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    if (carts.length > 0) return carts[0].cart_id;
    const [result] = await db.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    return result.insertId;
}

async function getCartItems(userId) {
    await ensureOrderReviewSchema();
    const [rows] = await db.execute(`
        SELECT
            ci.cart_item_id,
            ci.dish_id,
            ci.combo_id,
            ci.is_combo,
            ci.quantity,
            CASE WHEN ci.is_combo = 1 THEN co.combo_name ELSE d.dish_name END AS dish_name,
            CASE WHEN ci.is_combo = 1 THEN co.discount_price ELSE d.price END AS price,
            CASE WHEN ci.is_combo = 1 THEN co.image_url ELSE d.image_url END AS image_url,
            CASE WHEN ci.is_combo = 1 THEN 'combo' ELSE 'dish' END AS item_type
        FROM carts c
        JOIN cart_items ci ON c.cart_id = ci.cart_id
        LEFT JOIN dishes d ON ci.dish_id = d.dish_id
        LEFT JOIN combos co ON ci.combo_id = co.combo_id
        WHERE c.user_id = ?
        ORDER BY ci.cart_item_id DESC`, [userId]);
    return rows;
}

async function getCartCount(userId) {
    const [rows] = await db.execute(`
        SELECT COALESCE(SUM(ci.quantity), 0) AS total
        FROM carts c
        LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
        WHERE c.user_id = ?`, [userId]);
    return Number(rows[0]?.total || 0);
}

router.post('/cart/add', requireLogin, async (req, res) => {
    try {
        await ensureOrderReviewSchema();
        const { dish_id } = req.body;
        const [[dish]] = await db.execute(
            'SELECT dish_id, dish_name, price, image_url FROM dishes WHERE dish_id = ? AND is_available = 1',
            [dish_id]
        );
        if (!dish) return res.json({ success: false, message: 'Món ăn không tồn tại hoặc đã ngừng bán' });

        const cartId = await ensureCart(req.session.userId);
        const [existing] = await db.execute(
            'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND dish_id = ? AND is_combo = 0',
            [cartId, dish.dish_id]
        );
        if (existing.length > 0) {
            await db.execute('UPDATE cart_items SET quantity = quantity + 1 WHERE cart_item_id = ?', [existing[0].cart_item_id]);
        } else {
            await db.execute('INSERT INTO cart_items (cart_id, dish_id, combo_id, is_combo, quantity) VALUES (?, ?, NULL, 0, 1)', [cartId, dish.dish_id]);
        }
        const totalItems = await getCartCount(req.session.userId);
        res.json({ success: true, totalItems, message: `Đã thêm "${dish.dish_name}" vào giỏ hàng!` });
    } catch (error) {
        console.error('Lỗi thêm món vào giỏ:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm món vào giỏ hàng' });
    }
});

router.post('/cart/add-combo', requireLogin, async (req, res) => {
    try {
        await ensureOrderReviewSchema();
        const { combo_id } = req.body;
        const [[combo]] = await db.execute(`
            SELECT combo_id, combo_name, discount_price, image_url
            FROM combos co
            WHERE co.combo_id = ?
              AND co.is_available = 1
              AND NOT EXISTS (
                  SELECT 1 FROM combo_items ci
                  JOIN dishes d ON ci.dish_id = d.dish_id
                  WHERE ci.combo_id = co.combo_id AND d.is_available = 0
              )`,
            [combo_id]
        );
        if (!combo) return res.json({ success: false, message: 'Combo không tồn tại hoặc đã ngừng bán' });

        const cartId = await ensureCart(req.session.userId);
        const [existing] = await db.execute(
            'SELECT cart_item_id FROM cart_items WHERE cart_id = ? AND combo_id = ? AND is_combo = 1',
            [cartId, combo.combo_id]
        );
        if (existing.length > 0) {
            await db.execute('UPDATE cart_items SET quantity = quantity + 1 WHERE cart_item_id = ?', [existing[0].cart_item_id]);
        } else {
            await db.execute('INSERT INTO cart_items (cart_id, dish_id, combo_id, is_combo, quantity) VALUES (?, NULL, ?, 1, 1)', [cartId, combo.combo_id]);
        }
        const totalItems = await getCartCount(req.session.userId);
        res.json({ success: true, totalItems, message: `Đã thêm "${combo.combo_name}" vào giỏ hàng!` });
    } catch (error) {
        console.error('Lỗi thêm combo vào giỏ:', error);
        res.status(500).json({ success: false, message: 'Lỗi thêm combo vào giỏ hàng' });
    }
});

router.get('/cart', requireLogin, async (req, res) => {
    const cart = await getCartItems(req.session.userId);
    const pricing = await calculateCartPricing(cart, null);
    res.render('client/pages/cart', { cart, pricing, couponMessage: null, couponError: null });
});

router.post('/cart/apply-coupon', requireLogin, async (req, res) => {
    try {
        const cart = await getCartItems(req.session.userId);
        const code = normalizeCode(req.body.coupon_code);
        if (!code) {
            delete req.session.couponCode;
            delete req.session.couponMessage;
            req.session.couponError = 'Vui lòng nhập mã giảm giá.';
            return res.redirect('/cart');
        }
        const pricing = await calculateCartPricing(cart, code);
        if (pricing.couponError) {
            delete req.session.couponCode;
            delete req.session.couponMessage;
            req.session.couponError = pricing.couponError;
        } else {
            req.session.couponCode = pricing.couponCode;
            delete req.session.couponError;
            req.session.couponMessage = `Đã áp dụng mã ${pricing.couponCode}, giảm ${pricing.discountAmount.toLocaleString('vi-VN')} ₫.`;
        }
        res.redirect('/cart');
    } catch (error) {
        console.error('Lỗi áp dụng mã giảm giá:', error);
        req.session.couponError = 'Không thể áp dụng mã giảm giá.';
        res.redirect('/cart');
    }
});

router.post('/cart/remove-coupon', requireLogin, async (req, res) => {
    delete req.session.couponCode;
    req.session.couponMessage = 'Đã bỏ mã giảm giá.';
    res.redirect('/cart');
});

router.get('/cart/increase/:id', requireLogin, async (req, res) => {
    await db.execute(`UPDATE cart_items ci JOIN carts c ON ci.cart_id = c.cart_id SET ci.quantity = ci.quantity + 1 WHERE ci.cart_item_id = ? AND c.user_id = ?`, [req.params.id, req.session.userId]);
    res.redirect('/cart');
});

router.get('/cart/decrease/:id', requireLogin, async (req, res) => {
    await db.execute(`UPDATE cart_items ci JOIN carts c ON ci.cart_id = c.cart_id SET ci.quantity = ci.quantity - 1 WHERE ci.cart_item_id = ? AND c.user_id = ?`, [req.params.id, req.session.userId]);
    await db.execute(`DELETE ci FROM cart_items ci JOIN carts c ON ci.cart_id = c.cart_id WHERE ci.quantity <= 0 AND c.user_id = ?`, [req.session.userId]);
    res.redirect('/cart');
});

router.get('/cart/remove/:id', requireLogin, async (req, res) => {
    await db.execute(`DELETE ci FROM cart_items ci JOIN carts c ON ci.cart_id = c.cart_id WHERE ci.cart_item_id = ? AND c.user_id = ?`, [req.params.id, req.session.userId]);
    res.redirect('/cart');
});

module.exports = router;
module.exports.getCartItems = getCartItems;
module.exports.getCartCount = getCartCount;
