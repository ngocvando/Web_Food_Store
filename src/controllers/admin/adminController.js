const db = require('../../config/db');

function normalizeVoucherType(type) {
    const value = (type || '').toString().toLowerCase();
    if (value === 'percent' || value === 'percentage') return 'percent';
    if (value === 'freeship' || value === 'free_shipping') return 'freeship';
    return 'fixed';
}
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ensureOrderReviewSchema } = require('../../services/schemaHelper');
const { normalizeBankCode } = require('../../services/vietqr');
const { cleanInput, collapseSpaces, normalizeVoucherCode, toPositiveNumber, toNonNegativeNumber } = require('../../services/validators');


async function ensureDishImagesSchema() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS dish_images (
            image_id INT AUTO_INCREMENT PRIMARY KEY,
            dish_id INT NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            is_main TINYINT DEFAULT 0,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_dish_images_dish FOREIGN KEY (dish_id) REFERENCES dishes(dish_id) ON DELETE CASCADE
        )
    `);
}

function getUploadedFile(req, fieldName) {
    if (req.files && req.files[fieldName] && req.files[fieldName][0]) return req.files[fieldName][0];
    if (fieldName === 'image' && req.file) return req.file;
    return null;
}

function getUploadedFiles(req, fieldName) {
    if (req.files && req.files[fieldName]) return req.files[fieldName];
    return [];
}


const IMAGE_DIR = path.join(__dirname, '../../public/images');

function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.warn('[Image cleanup skipped]', err.message);
    }
}

async function optimizeUploadedImage(file, options = {}) {
    if (!file) return null;

    const width = options.width || 1200;
    const quality = options.quality || 80;
    const prefix = options.prefix || 'dish';
    const outputName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const outputPath = path.join(IMAGE_DIR, outputName);

    await sharp(file.path)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(outputPath);

    safeUnlink(file.path);
    return outputName;
}

async function optimizeUploadedImages(files, options = {}) {
    const results = [];
    for (const file of files || []) {
        const optimized = await optimizeUploadedImage(file, options);
        if (optimized) results.push(optimized);
    }
    return results;
}

const adminController = {
    // ===== DASHBOARD =====
    getDashboard: async (req, res) => {
        try {
            const safeQuery = async (sql, params = [], fallback = []) => {
                try {
                    const [rows] = await db.execute(sql, params);
                    return rows;
                } catch (err) {
                    console.warn('[Dashboard query skipped]', err.message);
                    return fallback;
                }
            };

            const [[orderCount = { total: 0 }]] = [await safeQuery('SELECT COUNT(*) as total FROM orders')];
            const [[dishCount = { total: 0 }]]  = [await safeQuery('SELECT COUNT(*) as total FROM dishes WHERE COALESCE(is_available, 1) = 1')];
            const [[revenue = { total: 0 }]]    = [await safeQuery(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE order_status = 'Completed'
                  AND (payment_method <> 'Banking' OR COALESCE(payment_status, 'Paid') = 'Paid')
            `)];
            const [[userCount = { total: 0 }]]  = [await safeQuery('SELECT COUNT(*) as total FROM users')];
            const [[completedOrders = { total: 0 }]] = [await safeQuery("SELECT COUNT(*) AS total FROM orders WHERE order_status = 'Completed'")];
            const [[avgOrderValue = { avg_value: 0 }]] = [await safeQuery(`
                SELECT COALESCE(AVG(total_amount), 0) AS avg_value
                FROM orders
                WHERE order_status = 'Completed'
                  AND (payment_method <> 'Banking' OR COALESCE(payment_status, 'Paid') = 'Paid')
            `)];
            const [[avgRating = { avg_rating: 0, total_reviews: 0 }]] = [await safeQuery(`
                SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total_reviews
                FROM reviews
            `)];
            const [[shippingStats = { total_shipping: 0, avg_distance: 0 }]] = [await safeQuery(`
                SELECT COALESCE(SUM(shipping_fee), 0) AS total_shipping,
                       COALESCE(AVG(NULLIF(distance_km, 0)), 0) AS avg_distance
                FROM orders
                WHERE order_status = 'Completed'
            `)];

            const sqlChart = `
                SELECT DATE(order_date) as date, COALESCE(SUM(total_amount), 0) as daily_revenue
                FROM orders
                WHERE order_status = 'Completed'
                  AND (payment_method <> 'Banking' OR COALESCE(payment_status, 'Paid') = 'Paid')
                  AND order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(order_date)
                ORDER BY date ASC`;
            const chartData = await safeQuery(sqlChart);

            const recentOrders = await safeQuery(`
                SELECT o.*, u.full_name FROM orders o
                JOIN users u ON o.user_id = u.user_id
                ORDER BY o.order_date DESC LIMIT 5`);

            const orderStatusStats = await safeQuery(`
                SELECT order_status, COUNT(*) AS total
                FROM orders
                GROUP BY order_status
                ORDER BY total DESC
            `);

            const topDishes = await safeQuery(`
                SELECT d.dish_name AS name,
                       COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                       COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN dishes d ON oi.dish_id = d.dish_id
                WHERE COALESCE(oi.is_combo, 0) = 0
                  AND o.order_status = 'Completed'
                GROUP BY d.dish_id, d.dish_name
                ORDER BY sold_quantity DESC
                LIMIT 5
            `);

            const topCombos = await safeQuery(`
                SELECT c.combo_name AS name,
                       COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                       COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN combos c ON oi.combo_id = c.combo_id
                WHERE COALESCE(oi.is_combo, 0) = 1
                  AND o.order_status = 'Completed'
                GROUP BY c.combo_id, c.combo_name
                ORDER BY sold_quantity DESC
                LIMIT 5
            `);

            const revenueByCategory = await safeQuery(`
                SELECT c.category_name AS category_name,
                       COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN dishes d ON oi.dish_id = d.dish_id
                JOIN categories c ON d.category_id = c.category_id
                WHERE COALESCE(oi.is_combo, 0) = 0
                  AND o.order_status = 'Completed'
                GROUP BY c.category_id, c.category_name
                ORDER BY revenue DESC
                LIMIT 6
            `);

            const discountStats = await safeQuery(`
                SELECT COALESCE(discount_code, 'Không dùng mã') AS code,
                       COUNT(*) AS used_count,
                       COALESCE(SUM(discount_amount), 0) + COALESCE(SUM(shipping_discount_amount), 0) AS total_discount
                FROM orders
                WHERE (discount_amount > 0 OR shipping_discount_amount > 0)
                GROUP BY discount_code
                ORDER BY used_count DESC, total_discount DESC
                LIMIT 5
            `);

            const ratingStats = await safeQuery(`
                SELECT rating, COUNT(*) AS total
                FROM reviews
                GROUP BY rating
                ORDER BY rating DESC
            `);

            const latestReviews = await safeQuery(`
                SELECT r.rating, r.comment, r.created_at, u.full_name
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.comment IS NOT NULL AND TRIM(r.comment) <> ''
                ORDER BY r.created_at DESC
                LIMIT 5
            `);

            const alerts = {
                pendingOrders: (await safeQuery("SELECT COUNT(*) AS total FROM orders WHERE order_status = 'Pending'"))[0]?.total || 0,
                preparingOrders: (await safeQuery("SELECT COUNT(*) AS total FROM orders WHERE order_status = 'Preparing'"))[0]?.total || 0,
                hiddenDishes: (await safeQuery("SELECT COUNT(*) AS total FROM dishes WHERE COALESCE(is_available, 1) = 0"))[0]?.total || 0,
                pendingPayments: (await safeQuery("SELECT COUNT(*) AS total FROM orders WHERE payment_method = 'Banking' AND COALESCE(payment_status, 'Pending') = 'Pending' AND order_status NOT IN ('Cancelled','Completed')"))[0]?.total || 0
            };

            res.render('admin/pages/dashboard', {
                title: 'Dashboard',
                stats: {
                    orders: orderCount.total,
                    dishes: dishCount.total,
                    revenue: revenue.total || 0,
                    users: userCount.total,
                    completedOrders: completedOrders.total || 0,
                    avgOrderValue: avgOrderValue.avg_value || 0,
                    avgRating: avgRating.avg_rating || 0,
                    totalReviews: avgRating.total_reviews || 0,
                    totalShipping: shippingStats.total_shipping || 0,
                    avgDistance: shippingStats.avg_distance || 0
                },
                chartData,
                recentOrders,
                orderStatusStats,
                topDishes,
                topCombos,
                revenueByCategory,
                discountStats,
                ratingStats,
                latestReviews,
                alerts
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi tải trang quản trị");
        }
    },

    // ===== DISHES =====
    getManageDishes: async (req, res) => {
        try {
            const [dishes] = await db.execute(
                'SELECT d.*, c.category_name FROM dishes d JOIN categories c ON d.category_id = c.category_id ORDER BY d.created_at DESC'
            );
            res.render('admin/pages/manage-dishes', { dishes, query: req.query });
        } catch (error) {
            res.status(500).send("Lỗi tải danh sách món ăn");
        }
    },

    getAddDish: async (req, res) => {
        const [categories] = await db.execute('SELECT * FROM categories');
        res.render('admin/pages/add-dish', { categories });
    },

    postAddDish: async (req, res) => {
        try {
            await ensureDishImagesSchema();
            const { category_id, is_available } = req.body;
            const dish_name = collapseSpaces(req.body.dish_name);
            const description = collapseSpaces(req.body.description);
            const dishPrice = toPositiveNumber(req.body.price);
            if (!dish_name || !dishPrice) return res.status(400).send('Tên món không được trống và giá món phải lớn hơn 0.');
            const mainFile = getUploadedFile(req, 'image');
            const galleryFiles = getUploadedFiles(req, 'gallery_images');
            const image_url = mainFile ? await optimizeUploadedImage(mainFile, { prefix: 'dish-main' }) : 'default-food.png';
            const galleryImageNames = await optimizeUploadedImages(galleryFiles, { prefix: 'dish-gallery' });
            const [result] = await db.execute(
                'INSERT INTO dishes (dish_name, category_id, price, image_url, description, is_available) VALUES (?, ?, ?, ?, ?, ?)',
                [dish_name, category_id, dishPrice, image_url, description, String(is_available) === '1' ? 1 : 0]
            );
            const dishId = result.insertId;
            await db.execute(
                'INSERT INTO dish_images (dish_id, image_url, is_main, sort_order) VALUES (?, ?, 1, 1)',
                [dishId, image_url]
            );
            for (let i = 0; i < galleryImageNames.length; i++) {
                await db.execute(
                    'INSERT INTO dish_images (dish_id, image_url, is_main, sort_order) VALUES (?, ?, 0, ?)',
                    [dishId, galleryImageNames[i], i + 2]
                );
            }
            res.redirect('/admin/dishes');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi thêm món ăn");
        }
    },

    getEditDish: async (req, res) => {
        try {
            await ensureDishImagesSchema();
            const [dishes] = await db.execute('SELECT * FROM dishes WHERE dish_id = ?', [req.params.id]);
            const [categories] = await db.execute('SELECT * FROM categories');
            const [dishImages] = await db.execute(
                'SELECT * FROM dish_images WHERE dish_id = ? ORDER BY is_main DESC, sort_order ASC, image_id ASC',
                [req.params.id]
            );
            if (dishes.length === 0) return res.status(404).send("Không tìm thấy món ăn");
            res.render('admin/pages/edit-dish', { dish: dishes[0], categories, dishImages });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi tải form sửa món ăn");
        }
    },

    postEditDish: async (req, res) => {
        try {
            await ensureDishImagesSchema();
            const { category_id, is_available, delete_images } = req.body;
            const dish_name = collapseSpaces(req.body.dish_name);
            const description = collapseSpaces(req.body.description);
            const dishPrice = toPositiveNumber(req.body.price);
            if (!dish_name || !dishPrice) return res.status(400).send('Tên món không được trống và giá món phải lớn hơn 0.');
            const { id } = req.params;
            const [existing] = await db.execute('SELECT image_url FROM dishes WHERE dish_id = ?', [id]);
            if (!existing.length) return res.status(404).send('Không tìm thấy món ăn');
            let image_url = existing[0].image_url;
            const mainFile = getUploadedFile(req, 'image');
            const galleryFiles = getUploadedFiles(req, 'gallery_images');

            if (mainFile) {
                const oldPath = path.join(__dirname, '../../public/images', image_url);
                if (fs.existsSync(oldPath) && image_url !== 'default-food.png') fs.unlinkSync(oldPath);
                image_url = await optimizeUploadedImage(mainFile, { prefix: 'dish-main' });
                await db.execute('UPDATE dish_images SET is_main = 0 WHERE dish_id = ?', [id]);
                await db.execute(
                    'INSERT INTO dish_images (dish_id, image_url, is_main, sort_order) VALUES (?, ?, 1, 1)',
                    [id, image_url]
                );
            }

            const imagesToDelete = Array.isArray(delete_images) ? delete_images : (delete_images ? [delete_images] : []);
            for (const imageId of imagesToDelete) {
                const [[img]] = await db.execute('SELECT image_url, is_main FROM dish_images WHERE image_id = ? AND dish_id = ?', [imageId, id]);
                if (img && Number(img.is_main) !== 1) {
                    const imgPath = path.join(__dirname, '../../public/images', img.image_url);
                    if (fs.existsSync(imgPath) && img.image_url !== 'default-food.png') fs.unlinkSync(imgPath);
                    await db.execute('DELETE FROM dish_images WHERE image_id = ? AND dish_id = ?', [imageId, id]);
                }
            }

            const [[maxSortRow]] = await db.execute('SELECT COALESCE(MAX(sort_order), 1) AS max_sort FROM dish_images WHERE dish_id = ?', [id]);
            let sort = Number(maxSortRow.max_sort || 1) + 1;
            const galleryImageNames = await optimizeUploadedImages(galleryFiles, { prefix: 'dish-gallery' });
            for (const imageName of galleryImageNames) {
                await db.execute(
                    'INSERT INTO dish_images (dish_id, image_url, is_main, sort_order) VALUES (?, ?, 0, ?)',
                    [id, imageName, sort++]
                );
            }

            const availableValue = String(is_available) === '1' ? 1 : 0;
            await db.execute(
                'UPDATE dishes SET dish_name=?, category_id=?, price=?, image_url=?, description=?, is_available=? WHERE dish_id=?',
                [dish_name, category_id, dishPrice, image_url, description, availableValue, id]
            );

            if (availableValue === 0) {
                await db.execute(`
                    UPDATE combos c
                    SET c.is_available = 0
                    WHERE EXISTS (
                        SELECT 1 FROM combo_items ci
                        WHERE ci.combo_id = c.combo_id AND ci.dish_id = ?
                    )
                `, [id]);
            }
            res.redirect('/admin/dishes');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi sửa món ăn");
        }
    },

    deleteDish: async (req, res) => {
        try {
            // Soft delete: món đã từng xuất hiện trong đơn hàng không nên xóa vật lý vì sẽ mất lịch sử/FK.
            // Ẩn món khỏi menu bằng is_available = 0 để vẫn giữ được dữ liệu đơn hàng cũ.
            // Đồng thời ẩn tất cả combo có chứa món này để không bán combo thiếu món.
            const dishId = req.params.id;
            await db.execute('UPDATE dishes SET is_available = 0 WHERE dish_id = ?', [dishId]);
            await db.execute(`
                UPDATE combos c
                SET c.is_available = 0
                WHERE EXISTS (
                    SELECT 1 FROM combo_items ci
                    WHERE ci.combo_id = c.combo_id AND ci.dish_id = ?
                )
            `, [dishId]);
            res.redirect('/admin/dishes?hidden=1');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi ẩn món ăn");
        }
    },

    // ===== CATEGORIES =====
    getCategories: async (req, res) => {
        try {
            const [categories] = await db.execute(`
                SELECT c.*, COUNT(d.dish_id) as dish_count
                FROM categories c LEFT JOIN dishes d ON c.category_id = d.category_id
                GROUP BY c.category_id`);
            res.render('admin/pages/categories', { categories });
        } catch (error) {
            res.status(500).send("Lỗi tải danh mục");
        }
    },

    postAddCategory: async (req, res) => {
        const category_name = collapseSpaces(req.body.category_name);
        const description = collapseSpaces(req.body.description);
        if (!category_name) return res.status(400).send('Tên danh mục không được để trống.');
        await db.execute('INSERT INTO categories (category_name, description) VALUES (?, ?)', [category_name, description]);
        res.redirect('/admin/categories');
    },

    deleteCategory: async (req, res) => {
        try {
            const [used] = await db.execute('SELECT COUNT(*) AS total FROM dishes WHERE category_id = ?', [req.params.id]);
            if (Number(used[0].total) > 0) {
                return res.status(400).send('Không thể xóa danh mục đang có món ăn. Hãy ẩn/chuyển món sang danh mục khác trước.');
            }
            await db.execute('DELETE FROM categories WHERE category_id = ?', [req.params.id]);
            res.redirect('/admin/categories');
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi khi xóa danh mục');
        }
    },

    // ===== COMBOS =====
    getCombos: async (req, res) => {
        try {
            const [combos] = await db.execute('SELECT * FROM combos ORDER BY combo_id DESC');
            const [dishes] = await db.execute('SELECT * FROM dishes WHERE is_available = 1');
            // Lấy các món trong mỗi combo
            for (let combo of combos) {
                const [items] = await db.execute(`
                    SELECT d.dish_name, d.price, ci.quantity FROM combo_items ci
                    JOIN dishes d ON ci.dish_id = d.dish_id
                    WHERE ci.combo_id = ?`, [combo.combo_id]);
                combo.items = items;
            }
            res.render('admin/pages/combos', { combos, dishes });
        } catch (error) {
            res.status(500).send("Lỗi tải combo");
        }
    },

    postAddCombo: async (req, res) => {
        try {
            const { combo_name, description, discount_price, dish_ids, quantities } = req.body;
            const image_url = req.file ? req.file.filename : 'default-food.png';
            const ids = (Array.isArray(dish_ids) ? dish_ids : [dish_ids]).filter(Boolean);
            const qtys = Array.isArray(quantities) ? quantities : [quantities];
            if (ids.length === 0) return res.status(400).send('Combo phải có ít nhất 1 món ăn');

            let originalPrice = 0;
            for (let i = 0; i < ids.length; i++) {
                const [[dish]] = await db.execute('SELECT price FROM dishes WHERE dish_id = ?', [ids[i]]);
                originalPrice += Number(dish?.price || 0) * Number(qtys[i] || 1);
            }

            const [result] = await db.execute(
                'INSERT INTO combos (combo_name, description, discount_price, image_url, original_price, is_available) VALUES (?, ?, ?, ?, ?, 1)',
                [combo_name, description, discount_price, image_url, originalPrice]
            );
            const combo_id = result.insertId;

            for (let i = 0; i < ids.length; i++) {
                await db.execute('INSERT INTO combo_items (combo_id, dish_id, quantity) VALUES (?, ?, ?)',
                    [combo_id, ids[i], Number(qtys[i] || 1)]);
            }
            res.redirect('/admin/combos');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi thêm combo");
        }
    },

    deleteCombo: async (req, res) => {
        try {
            // Soft delete combo để không làm mất chi tiết đơn hàng đã đặt combo.
            await db.execute('UPDATE combos SET is_available = 0 WHERE combo_id = ?', [req.params.id]);
            res.redirect('/admin/combos');
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi khi ẩn combo');
        }
    },

    // ===== USERS MANAGEMENT =====
    getUsers: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const [users] = await db.execute(`
                SELECT u.*, r.role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.role_id
                ORDER BY u.created_at DESC`);
            res.render('admin/pages/manage-users', { users, title: 'Quản lý Người dùng' });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi tải danh sách người dùng");
        }
    },

    updateUserRole: async (req, res) => {
        const { userId, roleId } = req.body;
        try {
            await db.execute('UPDATE users SET role_id = ? WHERE user_id = ?', [roleId, userId]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    },

    toggleUserStatus: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const userId = req.params.id;
            const [[user]] = await db.execute('SELECT user_id, is_active, role_id FROM users WHERE user_id = ?', [userId]);
            if (!user) return res.status(404).send('Không tìm thấy người dùng');
            if (Number(user.user_id) === Number(req.session.userId)) {
                return res.status(400).send('Không thể khóa chính tài khoản admin đang đăng nhập');
            }
            const nextStatus = Number(user.is_active) === 1 ? 0 : 1;
            await db.execute('UPDATE users SET is_active = ? WHERE user_id = ?', [nextStatus, userId]);
            res.redirect('/admin/users');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi cập nhật trạng thái người dùng");
        }
    },

    deleteUser: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const userId = req.params.id;
            if (Number(userId) === Number(req.session.userId)) {
                return res.status(400).send('Không thể xóa chính tài khoản admin đang đăng nhập');
            }
            // Xóa mềm tài khoản: khóa tài khoản thay vì xóa cứng để giữ lịch sử đơn hàng.
            await db.execute('UPDATE users SET is_active = 0 WHERE user_id = ?', [userId]);
            res.redirect('/admin/users?deleted=1');
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi xóa mềm người dùng");
        }
    },

    // ===== VOUCHER MANAGEMENT =====
    getVouchers: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const [vouchers] = await db.execute(`
                SELECT * FROM discount_codes
                WHERE deleted_at IS NULL
                ORDER BY is_active DESC, created_at DESC, discount_id DESC
            `);
            res.render('admin/pages/vouchers', {
                title: 'Quản lý Voucher',
                vouchers,
                query: req.query || {}
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi tải danh sách voucher');
        }
    },

    postAddVoucher: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const { code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, start_date, end_date, is_active } = req.body;
            const normalizedCode = normalizeVoucherCode(code);
            if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) return res.redirect('/admin/vouchers?error=missing_code');
            const voucherType = normalizeVoucherType(discount_type);
            const voucherValue = toNonNegativeNumber(discount_value);
            if ((voucherType === 'fixed' || voucherType === 'percent') && voucherValue <= 0) return res.redirect('/admin/vouchers?error=invalid_value');
            if (voucherType === 'percent' && voucherValue > 100) return res.redirect('/admin/vouchers?error=invalid_percent');

            await db.execute(`
                INSERT INTO discount_codes
                (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count, is_active, start_date, end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            `, [
                normalizedCode,
                description || '',
                voucherType,
                voucherValue,
                toNonNegativeNumber(min_order_amount),
                toNonNegativeNumber(max_discount_amount),
                Math.floor(toNonNegativeNumber(usage_limit)),
                is_active ? 1 : 0,
                start_date || null,
                end_date || null
            ]);
            res.redirect('/admin/vouchers?saved=1');
        } catch (error) {
            console.error(error);
            res.redirect('/admin/vouchers?error=duplicate_or_invalid');
        }
    },

    postUpdateVoucher: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const { description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, start_date, end_date, is_active } = req.body;
            const voucherType = normalizeVoucherType(discount_type);
            const voucherValue = toNonNegativeNumber(discount_value);
            if ((voucherType === 'fixed' || voucherType === 'percent') && voucherValue <= 0) return res.redirect('/admin/vouchers?error=invalid_value');
            if (voucherType === 'percent' && voucherValue > 100) return res.redirect('/admin/vouchers?error=invalid_percent');
            await db.execute(`
                UPDATE discount_codes
                SET description = ?,
                    discount_type = ?,
                    discount_value = ?,
                    min_order_amount = ?,
                    max_discount_amount = ?,
                    usage_limit = ?,
                    is_active = ?,
                    start_date = ?,
                    end_date = ?
                WHERE discount_id = ?
            `, [
                description || '',
                voucherType,
                voucherValue,
                toNonNegativeNumber(min_order_amount),
                toNonNegativeNumber(max_discount_amount),
                Math.floor(toNonNegativeNumber(usage_limit)),
                is_active ? 1 : 0,
                start_date || null,
                end_date || null,
                req.params.id
            ]);
            res.redirect('/admin/vouchers?updated=1');
        } catch (error) {
            console.error(error);
            res.redirect('/admin/vouchers?error=update_failed');
        }
    },

    toggleVoucher: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            await db.execute('UPDATE discount_codes SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE discount_id = ? AND deleted_at IS NULL', [req.params.id]);
            res.redirect('/admin/vouchers?toggled=1');
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi cập nhật trạng thái voucher');
        }
    },

    deleteVoucher: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            await db.execute('UPDATE discount_codes SET is_active = 0, deleted_at = NOW() WHERE discount_id = ?', [req.params.id]);
            res.redirect('/admin/vouchers?deleted=1');
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi xóa mềm voucher');
        }
    },

    // ===== QR / SETTINGS =====
    getSettings: async (req, res) => {
        try {
            const [rows] = await db.execute("SELECT * FROM settings");
            const settings = {};
            rows.forEach(r => settings[r.setting_key] = r.setting_value);
            res.render('admin/pages/settings', { settings, title: 'Cài đặt', query: req.query });
        } catch(e) {
            res.status(500).send("Lỗi tải cài đặt: " + e.message);
        }
    },

    postSettings: async (req, res) => {
        try {
            const { qr_bank_name, qr_bank_code, qr_account, qr_name, qr_template, shipping_base_fee, shipping_base_km, shipping_per_km, shipping_max_km, shop_address, shop_lat, shop_lng, google_maps_api_key, home_banner_image } = req.body;
            const normalizedBankCode = normalizeBankCode(qr_bank_code);
            const pairs = {
                // qr_bank giữ lại để tương thích với code cũ, nhưng luôn lưu bằng mã VietQR chuẩn.
                qr_bank: normalizedBankCode,
                qr_bank_name: qr_bank_name || normalizedBankCode,
                qr_bank_code: normalizedBankCode,
                qr_account: (qr_account || '').replace(/\s+/g, ''),
                qr_name: (qr_name || '').trim().toUpperCase(),
                qr_template: qr_template || 'compact2',
                // Không dùng upload ảnh QR tĩnh nữa. QR được tạo động theo từng đơn hàng.
                qr_image: '',
                shipping_base_fee: String(Math.max(0, Number(shipping_base_fee || 15000))),
                shipping_base_km: String(Math.max(0.1, Number(shipping_base_km || 3))),
                shipping_per_km: String(Math.max(0, Number(shipping_per_km || 3000))),
                shipping_max_km: String(Math.max(0, Number(shipping_max_km || 20))),
                shop_address: shop_address || 'Cơm Quê, Hưng Yên',
                shop_lat: String(Number(shop_lat || 20.64637)),
                shop_lng: String(Number(shop_lng || 106.05112)),
                google_maps_api_key: (google_maps_api_key || '').trim(),
                home_banner_image: (home_banner_image || '/images/comque-sale-banner.jpg').trim()
            };
            for (const [k, v] of Object.entries(pairs)) {
                if (v !== undefined) {
                    await db.execute(
                        "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
                        [k, v, v]
                    );
                }
            }
            res.redirect('/admin/settings?saved=1');
        } catch(e) {
            res.status(500).send("Lỗi lưu cài đặt: " + e.message);
        }
    },

    // ===== REVIEWS =====
    getReviews: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
            const [reviews] = await db.execute(`
                SELECT r.*, u.username, u.full_name, o.order_id,
                       COALESCE(
                           CASE WHEN r.is_combo = 1 THEN co.combo_name ELSE d.dish_name END,
                           CONCAT('Đánh giá đơn hàng #', r.order_id)
                       ) AS item_name,
                       CASE
                           WHEN r.dish_id IS NULL AND r.combo_id IS NULL THEN 'Đơn hàng'
                           WHEN r.is_combo = 1 THEN 'Combo'
                           ELSE 'Món ăn'
                       END AS item_type
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                LEFT JOIN orders o ON r.order_id = o.order_id
                LEFT JOIN dishes d ON r.dish_id = d.dish_id
                LEFT JOIN combos co ON r.combo_id = co.combo_id
                ORDER BY r.created_at DESC`);
            res.render('admin/pages/reviews', { reviews });
        } catch (error) {
            res.status(500).send("Lỗi tải đánh giá");
        }
    },

    deleteReview: async (req, res) => {
        await ensureOrderReviewSchema();
        await db.execute("UPDATE reviews SET status = 'hidden' WHERE review_id = ?", [req.params.id]);
        res.redirect('/admin/reviews');
    },
    toggleReview: async (req, res) => {
        await ensureOrderReviewSchema();
        const [rows] = await db.execute("SELECT COALESCE(status,'visible') status FROM reviews WHERE review_id = ?", [req.params.id]);
        if (rows.length) {
            const nextStatus = rows[0].status === 'hidden' ? 'visible' : 'hidden';
            await db.execute("UPDATE reviews SET status = ? WHERE review_id = ?", [nextStatus, req.params.id]);
        }
        res.redirect('/admin/reviews');
    }
};

module.exports = adminController;

// ===== USERS (append before module.exports) =====
