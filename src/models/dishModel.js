const db = require('../config/db');

const Dish = {
    // Lấy tất cả món ăn đang phục vụ (is_available = 1)
    getAllAvailable: async () => {
        try {
            const [rows] = await db.execute(
                `SELECT d.*, c.category_name 
                 FROM dishes d 
                 JOIN categories c ON d.category_id = c.category_id 
                 WHERE d.is_available = 1
                 ORDER BY d.dish_id DESC`
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Lấy món mới nhất theo thời điểm admin thêm món.
    // Ưu tiên created_at DESC; dùng dish_id DESC để dự phòng dữ liệu cũ chưa có created_at.
    getLatestAvailable: async (limit = 5) => {
        try {
            const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
            const [rows] = await db.execute(
                `SELECT d.*, c.category_name
                 FROM dishes d
                 JOIN categories c ON d.category_id = c.category_id
                 WHERE d.is_available = 1
                 ORDER BY COALESCE(d.created_at, '1970-01-01') DESC, d.dish_id DESC
                 LIMIT ${safeLimit}`
            );
            return rows;
        } catch (error) {
            // Nếu database cũ chưa có cột created_at, vẫn hiển thị món mới theo id mới nhất.
            if (error && error.code === 'ER_BAD_FIELD_ERROR') {
                const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
                const [rows] = await db.execute(
                    `SELECT d.*, c.category_name
                     FROM dishes d
                     JOIN categories c ON d.category_id = c.category_id
                     WHERE d.is_available = 1
                     ORDER BY d.dish_id DESC
                     LIMIT ${safeLimit}`
                );
                return rows;
            }
            throw error;
        }
    },

    // Lấy món ăn theo danh mục
    getByCategory: async (categoryId) => {
        const [rows] = await db.execute('SELECT * FROM dishes WHERE category_id = ?', [categoryId]);
        return rows;
    }
};

module.exports = Dish;