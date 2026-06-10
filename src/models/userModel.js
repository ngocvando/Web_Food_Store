const db = require('../config/db');

const User = {
    // Tạo tài khoản mới
    create: async (userData) => {
        const { username, password, full_name, email, phone, address, role_id } = userData;
        const sql = `INSERT INTO users (username, password, full_name, email, phone, address, role_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [username, password, full_name, email, phone, address, role_id || 3]);
        return result;
    },

    // Tìm người dùng để đăng nhập
    findByUsername: async (username) => {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        return rows[0];
    },

    findByIdentifier: async (identifier) => {
        const keyword = (identifier || '').trim();
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1',
            [keyword, keyword, keyword]
        );
        return rows[0];
    },

    updatePassword: async (userId, hashedPassword) => {
        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, userId]
        );
        return result;
    },

    savePasswordOtp: async (userId, otpCode, otpExpire) => {
        const [result] = await db.execute(
            'UPDATE users SET otp_code = ?, otp_expire = ?, otp_attempts = 0 WHERE user_id = ?',
            [otpCode, otpExpire, userId]
        );
        return result;
    },

    findByEmail: async (email) => {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0];
    },

    increaseOtpAttempts: async (userId) => {
        const [result] = await db.execute(
            'UPDATE users SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE user_id = ?',
            [userId]
        );
        return result;
    },

    clearPasswordOtp: async (userId) => {
        const [result] = await db.execute(
            'UPDATE users SET otp_code = NULL, otp_expire = NULL, otp_attempts = 0 WHERE user_id = ?',
            [userId]
        );
        return result;
    }
};

module.exports = User;