const db = require('../../config/db');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');

function clean(value) {
    return (value || '').toString().trim();
}

function toInt(value) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

const reviewController = {
    postReview: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');

        const userId = req.session.userId;
        const orderId = toInt(req.body.order_id);
        const rating = toInt(req.body.rating);
        const comment = clean(req.body.comment);

        try {
            await ensureOrderReviewSchema();
            if (!orderId || !rating || rating < 1 || rating > 5) {
                return res.redirect('/my-orders?review_error=invalid');
            }

            // Logic mới: mỗi đơn hàng chỉ có 1 đánh giá tổng thể.
            // Khách chỉ được đánh giá đơn hàng của chính mình khi đơn đã hoàn thành.
            const [orders] = await db.execute(
                `SELECT order_id FROM orders
                 WHERE order_id = ? AND user_id = ? AND order_status = 'Completed'
                 LIMIT 1`,
                [orderId, userId]
            );

            if (orders.length === 0) {
                return res.status(403).send('Bạn chỉ có thể đánh giá đơn hàng đã hoàn thành của mình.');
            }

            const [existing] = await db.execute(
                `SELECT review_id FROM reviews
                 WHERE user_id = ? AND order_id = ?
                 LIMIT 1`,
                [userId, orderId]
            );

            if (existing.length > 0) {
                await db.execute(
                    `UPDATE reviews
                     SET dish_id = NULL,
                         combo_id = NULL,
                         is_combo = 0,
                         rating = ?,
                         comment = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE review_id = ?`,
                    [rating, comment, existing[0].review_id]
                );
            } else {
                await db.execute(
                    `INSERT INTO reviews (user_id, order_id, dish_id, combo_id, is_combo, rating, comment)
                     VALUES (?, ?, NULL, NULL, 0, ?, ?)`,
                    [userId, orderId, rating, comment]
                );
            }

            res.redirect('/my-orders?reviewed=1');
        } catch (error) {
            console.error('Lỗi đánh giá:', error);
            res.status(500).send('Lỗi khi gửi đánh giá: ' + error.message);
        }
    }
};

module.exports = reviewController;
