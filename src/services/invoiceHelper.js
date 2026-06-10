const db = require('../config/db');

async function getInvoiceData(orderId, userId = null) {
    const params = [orderId];
    let userFilter = '';
    if (userId) {
        userFilter = ' AND o.user_id = ?';
        params.push(userId);
    }

    const [orders] = await db.execute(`
        SELECT o.*, u.full_name, u.email, u.phone, u.address as user_address
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        WHERE o.order_id = ? ${userFilter}
        LIMIT 1
    `, params);

    if (orders.length === 0) return null;

    const [items] = await db.execute(`
        SELECT oi.*,
               COALESCE(oi.item_name_snapshot, CASE WHEN oi.is_combo = 1 THEN co.combo_name ELSE d.dish_name END) AS dish_name,
               COALESCE(oi.image_snapshot, CASE WHEN oi.is_combo = 1 THEN co.image_url ELSE d.image_url END) AS image_url,
               CASE WHEN oi.is_combo = 1 THEN 'combo' ELSE 'dish' END AS item_type
        FROM order_items oi
        LEFT JOIN dishes d ON oi.dish_id = d.dish_id
        LEFT JOIN combos co ON oi.combo_id = co.combo_id
        WHERE oi.order_id = ?
    `, [orderId]);

    const [[settings]] = await db.execute('SELECT * FROM settings LIMIT 1');

    return {
        order: orders[0],
        items,
        settings: settings || {}
    };
}

module.exports = { getInvoiceData };
