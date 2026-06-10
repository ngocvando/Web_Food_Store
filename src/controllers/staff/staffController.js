const db = require('../../config/db');
const { validateOrderStatusTransition } = require('../../services/orderStatus');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');
const { getInvoiceData } = require('../../services/invoiceHelper');

const staffController = {
    // Dashboard nhân viên
    getDashboard: async (req, res) => {
        try {
            const [pendingOrders] = await db.execute(
                "SELECT COUNT(*) as total FROM orders WHERE order_status = 'Pending'"
            );
            const [preparingOrders] = await db.execute(
                "SELECT COUNT(*) as total FROM orders WHERE order_status = 'Preparing'"
            );
            const [todayOrders] = await db.execute(
                "SELECT COUNT(*) as total FROM orders WHERE DATE(order_date) = CURDATE()"
            );
            const [todayRevenue] = await db.execute(
                "SELECT SUM(total_amount) as total FROM orders WHERE DATE(order_date) = CURDATE() AND order_status = 'Completed'"
            );
            const [recentOrders] = await db.execute(`
                SELECT o.*, u.full_name, u.phone, u.address as user_address
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                ORDER BY o.order_date DESC LIMIT 10`);

            res.render('staff/pages/dashboard', {
                title: 'Nhân Viên - Dashboard',
                stats: {
                    pending: pendingOrders[0].total,
                    preparing: preparingOrders[0].total,
                    todayOrders: todayOrders[0].total,
                    todayRevenue: todayRevenue[0].total || 0
                },
                recentOrders
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi tải trang nhân viên");
        }
    },

    // Danh sách đơn hàng (nhân viên)
    getOrders: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const [orders] = await db.execute(`
                SELECT o.*, u.full_name, u.phone, u.address as user_address
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                ORDER BY o.order_date DESC`);

            // Lấy chi tiết từng đơn hàng
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

            res.render('staff/pages/orders', {
                title: 'Nhân Viên - Đơn Hàng',
                orders
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi tải danh sách đơn hàng");
        }
    },

    // Cập nhật trạng thái đơn (nhân viên chỉ được Preparing / Shipping / Completed)
    updateOrderStatus: async (req, res) => {
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
            res.json({ success: true, message: 'Cập nhật thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
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
    },

    printInvoice: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const data = await getInvoiceData(req.params.id);
            if (!data) return res.status(404).send('Không tìm thấy hóa đơn');

            res.render('client/pages/invoice-print', {
                ...data,
                canPrintInvoice: true,
                backUrl: '/staff/orders'
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi in hóa đơn');
        }
    },

    // Xem thực đơn (nhân viên)
    getMenu: async (req, res) => {
        try {
            const [dishes] = await db.execute(`
                SELECT d.*, c.category_name
                FROM dishes d
                JOIN categories c ON d.category_id = c.category_id
                ORDER BY c.category_name, d.dish_name`);
            const [categories] = await db.execute('SELECT * FROM categories ORDER BY category_name');
            res.render('staff/pages/menu', {
                title: 'Nhân Viên - Thực Đơn',
                dishes,
                categories
            });
        } catch (error) {
            res.status(500).send("Lỗi tải thực đơn");
        }
    }
};

module.exports = staffController;
