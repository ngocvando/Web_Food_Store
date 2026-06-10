const db = require('../config/db');

let ensured = false;

async function getDatabaseName() {
    const [rows] = await db.execute('SELECT DATABASE() AS db_name');
    return rows[0].db_name;
}

async function tableExists(tableName) {
    const dbName = await getDatabaseName();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [dbName, tableName]
    );
    return Number(rows[0].total) > 0;
}

async function columnExists(tableName, columnName) {
    const dbName = await getDatabaseName();
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, columnName]
    );
    return Number(rows[0].total) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
    if (!(await tableExists(tableName))) return;
    if (!(await columnExists(tableName, columnName))) {
        await db.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    }
}

async function ensureOrderReviewSchema() {
    if (ensured) return;


    if (!(await tableExists('combos'))) {
        await db.execute(`
            CREATE TABLE combos (
                combo_id INT AUTO_INCREMENT PRIMARY KEY,
                combo_name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                discount_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                image_url VARCHAR(255) NULL,
                is_available TINYINT(1) DEFAULT 1,
                original_price DECIMAL(10,2) DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    }

    if (!(await tableExists('combo_items'))) {
        await db.execute(`
            CREATE TABLE combo_items (
                combo_id INT NOT NULL,
                dish_id INT NOT NULL,
                quantity INT DEFAULT 1,
                PRIMARY KEY (combo_id, dish_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    }

    // Các cột này giúp trang checkout/lịch sử đơn hàng hoạt động cả khi người dùng
    // đang chạy database cũ chưa import file SQL mới.
    await addColumnIfMissing('orders', 'receiver_name', 'VARCHAR(100) NULL');
    await addColumnIfMissing('orders', 'delivery_phone', 'VARCHAR(20) NULL');
    await addColumnIfMissing('orders', 'delivery_address', 'TEXT NULL');
    await addColumnIfMissing('orders', 'payment_method', "VARCHAR(20) NULL DEFAULT 'COD'");
    await addColumnIfMissing('orders', 'payment_status', "VARCHAR(30) NULL DEFAULT 'Unpaid'");
    await addColumnIfMissing('orders', 'payment_reference', 'VARCHAR(80) NULL');

    await addColumnIfMissing('orders', 'subtotal_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('orders', 'shipping_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('orders', 'discount_code', 'VARCHAR(50) NULL');
    await addColumnIfMissing('orders', 'discount_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('orders', 'shipping_discount_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('orders', 'distance_km', 'DECIMAL(8,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('orders', 'delivery_lat', 'DECIMAL(10,7) NULL');
    await addColumnIfMissing('orders', 'delivery_lng', 'DECIMAL(10,7) NULL');

    if (!(await tableExists('discount_codes'))) {
        await db.execute(`
            CREATE TABLE discount_codes (
                discount_id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(255) NULL,
                discount_type ENUM('percent','fixed','freeship') NOT NULL DEFAULT 'fixed',
                discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
                min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                max_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                usage_limit INT NOT NULL DEFAULT 0,
                used_count INT NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                start_date DATETIME NULL,
                end_date DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        await db.execute(`
            INSERT INTO discount_codes (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active)
            VALUES
            ('COMQUE10', 'Giảm 10% tối đa 30.000đ cho đơn từ 100.000đ', 'percent', 10, 100000, 30000, 0, 1),
            ('FREESHIP', 'Miễn phí giao hàng tối đa 20.000đ cho đơn từ 80.000đ', 'freeship', 20000, 80000, 0, 0, 1),
            ('GIAM20K', 'Giảm trực tiếp 20.000đ cho đơn từ 100.000đ', 'fixed', 20000, 100000, 0, 0, 1)
        `);
    }

    // Đảm bảo database cũ cũng hỗ trợ đủ 3 loại voucher: percent, fixed, freeship.
    if (await tableExists('discount_codes')) {
        try {
            await db.execute("ALTER TABLE discount_codes MODIFY discount_type ENUM('percent','fixed','freeship') NOT NULL DEFAULT 'fixed'");
        } catch (e) {
            console.warn('Không thể cập nhật enum discount_type:', e.message);
        }
    }

    await addColumnIfMissing('discount_codes', 'deleted_at', 'DATETIME NULL');

    if (!(await tableExists('voucher_usages'))) {
        await db.execute(`
            CREATE TABLE voucher_usages (
                usage_id INT AUTO_INCREMENT PRIMARY KEY,
                discount_id INT NOT NULL,
                user_id INT NOT NULL,
                order_id INT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_voucher_user_order (discount_id, user_id, order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    }



    await addColumnIfMissing('users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
    await addColumnIfMissing('users', 'otp_code', 'VARCHAR(10) NULL');
    await addColumnIfMissing('users', 'otp_expire', 'DATETIME NULL');
    await addColumnIfMissing('users', 'otp_attempts', 'INT NOT NULL DEFAULT 0');

    await addColumnIfMissing('cart_items', 'combo_id', 'INT NULL');
    await addColumnIfMissing('cart_items', 'is_combo', 'TINYINT(1) NULL DEFAULT 0');

    await addColumnIfMissing('order_items', 'combo_id', 'INT NULL');
    await addColumnIfMissing('order_items', 'is_combo', 'TINYINT(1) NULL DEFAULT 0');
    await addColumnIfMissing('order_items', 'item_name_snapshot', 'VARCHAR(255) NULL');
    await addColumnIfMissing('order_items', 'image_snapshot', 'VARCHAR(255) NULL');

    if (!(await tableExists('reviews'))) {
        await db.execute(`
            CREATE TABLE reviews (
                review_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                order_id INT NOT NULL,
                dish_id INT NULL,
                combo_id INT NULL,
                is_combo TINYINT(1) DEFAULT 0,
                rating TINYINT NOT NULL,
                comment TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'visible'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
    } else {
        await addColumnIfMissing('reviews', 'order_id', 'INT NULL');
        await addColumnIfMissing('reviews', 'combo_id', 'INT NULL');
        await addColumnIfMissing('reviews', 'is_combo', 'TINYINT(1) NULL DEFAULT 0');
        await addColumnIfMissing('reviews', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');
        await addColumnIfMissing('reviews', 'status', "VARCHAR(20) NOT NULL DEFAULT 'visible'");
    }

    ensured = true;
}

module.exports = { ensureOrderReviewSchema };
