const Dish = require('../../models/dishModel');
const db = require('../../config/db');


async function ensureDishImagesSchema() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS dish_images (
            image_id INT AUTO_INCREMENT PRIMARY KEY,
            dish_id INT NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            is_main TINYINT DEFAULT 0,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_dish_images_dish_client FOREIGN KEY (dish_id) REFERENCES dishes(dish_id) ON DELETE CASCADE
        )
    `);
}

const foodController = {
    // Trang chủ - kèm danh mục
    getHome: async (req, res) => {
        try {
            const dishes = await Dish.getAllAvailable();
            const latestDishes = await Dish.getLatestAvailable(5);
            const [categories] = await db.execute(`
                SELECT c.*, COUNT(d.dish_id) as dish_count
                FROM categories c
                LEFT JOIN dishes d ON d.category_id = c.category_id AND d.is_available = 1
                GROUP BY c.category_id
                ORDER BY c.category_name`);
            const [combos] = await db.execute(`
                SELECT co.*, GROUP_CONCAT(CONCAT(d.dish_name, ' x', ci.quantity) SEPARATOR ', ') AS items_text
                FROM combos co
                LEFT JOIN combo_items ci ON co.combo_id = ci.combo_id
                LEFT JOIN dishes d ON ci.dish_id = d.dish_id
                WHERE co.is_available = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM combo_items ci2
                      JOIN dishes d2 ON ci2.dish_id = d2.dish_id
                      WHERE ci2.combo_id = co.combo_id AND d2.is_available = 0
                  )
                GROUP BY co.combo_id
                ORDER BY co.combo_id DESC`);
            const [customerReviews] = await db.execute(`
                SELECT
                    r.review_id,
                    r.rating,
                    r.comment,
                    r.created_at,
                    COALESCE(NULLIF(u.full_name, ''), u.username, 'Khách hàng') AS customer_name,
                    COALESCE(
                        CASE WHEN r.is_combo = 1 THEN co.combo_name ELSE d.dish_name END,
                        'Đơn hàng Cơm Quê'
                    ) AS item_name
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                LEFT JOIN dishes d ON r.dish_id = d.dish_id
                LEFT JOIN combos co ON r.combo_id = co.combo_id
                WHERE r.rating >= 4
                  AND COALESCE(r.status, 'visible') = 'visible'
                  AND r.comment IS NOT NULL
                  AND TRIM(r.comment) <> ''
                ORDER BY r.created_at DESC
                LIMIT 6
            `);
            res.render('client/pages/home', {
                title: 'Cơm Quê - Món Ngon Mỗi Ngày',
                dishes,
                latestDishes,
                categories,
                combos,
                customerReviews
            });
        } catch (error) {
            console.error("Lỗi trang chủ:", error);
            res.status(500).send("Có lỗi xảy ra.");
        }
    },

    // Trang thực đơn - kèm danh mục
    getMenu: async (req, res) => {
        try {
            const dishes = await Dish.getAllAvailable();
            const latestDishes = await Dish.getLatestAvailable(5);
            const [categories] = await db.execute(`
                SELECT c.*, COUNT(d.dish_id) as dish_count
                FROM categories c
                LEFT JOIN dishes d ON d.category_id = c.category_id AND d.is_available = 1
                GROUP BY c.category_id
                ORDER BY c.category_name`);
            const [combos] = await db.execute(`
                SELECT co.*, GROUP_CONCAT(CONCAT(d.dish_name, ' x', ci.quantity) SEPARATOR ', ') AS items_text
                FROM combos co
                LEFT JOIN combo_items ci ON co.combo_id = ci.combo_id
                LEFT JOIN dishes d ON ci.dish_id = d.dish_id
                WHERE co.is_available = 1
                  AND NOT EXISTS (
                      SELECT 1 FROM combo_items ci2
                      JOIN dishes d2 ON ci2.dish_id = d2.dish_id
                      WHERE ci2.combo_id = co.combo_id AND d2.is_available = 0
                  )
                GROUP BY co.combo_id
                ORDER BY co.combo_id DESC`);
            res.render('client/pages/menu', {
                title: 'Thực Đơn - Cơm Quê',
                dishes,
                latestDishes,
                categories,
                combos
            });
        } catch (error) {
            console.error("Lỗi khi lấy thực đơn:", error);
            res.status(500).send("Có lỗi xảy ra khi tải dữ liệu.");
        }
    },

    // Trang chi tiết món ăn
    getDishDetail: async (req, res) => {
        try {
            const dishId = req.params.id;
            const [[dish]] = await db.execute(`
                SELECT d.*, c.category_name
                FROM dishes d
                JOIN categories c ON d.category_id = c.category_id
                WHERE d.dish_id = ? AND d.is_available = 1
                LIMIT 1
            `, [dishId]);

            if (!dish) {
                return res.status(404).render('error', {
                    message: 'Không tìm thấy món ăn hoặc món đã ngừng bán.',
                    error: {}
                });
            }

            const [reviews] = await db.execute(`
                SELECT r.review_id, r.rating, r.comment, r.created_at,
                       COALESCE(NULLIF(u.full_name, ''), u.username, 'Khách hàng') AS customer_name
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.dish_id = ?
                  AND COALESCE(r.status, 'visible') = 'visible'
                  AND (r.is_combo = 0 OR r.is_combo IS NULL)
                  AND r.comment IS NOT NULL
                  AND TRIM(r.comment) <> ''
                ORDER BY r.created_at DESC
                LIMIT 8
            `, [dishId]);

            const [[ratingStats]] = await db.execute(`
                SELECT COUNT(*) AS total_reviews, COALESCE(AVG(rating), 0) AS avg_rating
                FROM reviews
                WHERE dish_id = ? AND COALESCE(status, 'visible') = 'visible' AND (is_combo = 0 OR is_combo IS NULL)
            `, [dishId]);

            const [relatedDishes] = await db.execute(`
                SELECT d.*, c.category_name
                FROM dishes d
                JOIN categories c ON d.category_id = c.category_id
                WHERE d.category_id = ?
                  AND d.dish_id <> ?
                  AND d.is_available = 1
                ORDER BY d.dish_id DESC
                LIMIT 4
            `, [dish.category_id, dishId]);

            await ensureDishImagesSchema();
            const [dishImages] = await db.execute(`
                SELECT image_url
                FROM dish_images
                WHERE dish_id = ?
                ORDER BY is_main DESC, sort_order ASC, image_id ASC
            `, [dishId]);
            const gallery = dishImages.length
                ? dishImages.map(img => img.image_url)
                : [dish.image_url || 'default-food.png'];

            res.render('client/pages/dish-detail', {
                title: `${dish.dish_name} - Cơm Quê`,
                dish,
                reviews,
                ratingStats,
                relatedDishes,
                gallery
            });
        } catch (error) {
            console.error('Lỗi trang chi tiết món ăn:', error);
            res.status(500).send('Có lỗi xảy ra khi tải chi tiết món ăn.');
        }
    }
};

module.exports = foodController;
