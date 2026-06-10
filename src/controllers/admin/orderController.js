const db = require('../../config/db');
const { validateOrderStatusTransition } = require('../../services/orderStatus');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');
const { getInvoiceData } = require('../../services/invoiceHelper');

const orderController = {
    // Lấy toàn bộ đơn hàng kèm thông tin đầy đủ người đặt + chi tiết món
    getAllOrders: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const [orders] = await db.execute(`
                SELECT o.*,
                    u.full_name, u.phone as user_phone, u.address as user_address, u.email
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                ORDER BY o.order_date DESC`);

            // Lấy chi tiết món ăn cho từng đơn
            for (let order of orders) {
                const [items] = await db.execute(`
                    SELECT oi.*,
                           CASE WHEN oi.is_combo = 1 THEN co.combo_name ELSE d.dish_name END AS dish_name,
                           CASE WHEN oi.is_combo = 1 THEN co.image_url ELSE d.image_url END AS image_url,
                           CASE WHEN oi.is_combo = 1 THEN 'combo' ELSE 'dish' END AS item_type
                    FROM order_items oi
                    LEFT JOIN dishes d ON oi.dish_id = d.dish_id
                    LEFT JOIN combos co ON oi.combo_id = co.combo_id
                    WHERE oi.order_id = ?`, [order.order_id]);
                order.items = items;
            }

            res.render('admin/pages/manage-orders', { orders, title: 'Quản lý Đơn hàng' });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi tải danh sách đơn hàng");
        }
    },

    updateStatus: async (req, res) => {
        const { orderId, status } = req.body;
        try {
            const [orders] = await db.execute('SELECT order_status, payment_method, payment_status FROM orders WHERE order_id = ?', [orderId]);
            if (orders.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
            }

            if (status === 'Preparing' && orders[0].payment_method === 'Banking' && orders[0].payment_status !== 'Paid') {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn chuyển khoản cần được xác nhận đã thanh toán trước khi chuyển sang chế biến.',
                    currentStatus: orders[0].order_status
                });
            }

            const check = validateOrderStatusTransition(orders[0].order_status, status);
            if (!check.ok) {
                return res.status(400).json({ success: false, message: check.message, currentStatus: orders[0].order_status });
            }

            await db.execute('UPDATE orders SET order_status = ? WHERE order_id = ?', [status, orderId]);
            res.json({ success: true, message: "Cập nhật trạng thái thành công" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Lỗi khi cập nhật" });
        }
    },

    printInvoice: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const data = await getInvoiceData(req.params.id);
            if (!data) return res.status(404).send('Không tìm thấy hóa đơn');

            res.render('client/pages/invoice-print', {
                ...data,
                canPrintInvoice: true,
                backUrl: '/admin/orders'
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi in hóa đơn');
        }
    },

    confirmPayment: async (req, res) => {
        const { orderId } = req.body;
        try {
            const [orders] = await db.execute('SELECT order_id, payment_method, order_status FROM orders WHERE order_id = ?', [orderId]);
            if (orders.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
            if (orders[0].payment_method !== 'Banking') return res.status(400).json({ success: false, message: 'Đơn này không phải chuyển khoản ngân hàng' });
            if (orders[0].order_status === 'Cancelled') return res.status(400).json({ success: false, message: 'Đơn đã hủy, không thể xác nhận thanh toán' });
            await db.execute('UPDATE orders SET payment_status = ? WHERE order_id = ?', ['Paid', orderId]);
            res.json({ success: true, message: 'Đã xác nhận thanh toán' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi xác nhận thanh toán' });
        }
    }
};

module.exports = orderController;
