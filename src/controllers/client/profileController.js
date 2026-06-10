const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const {
    collapseSpaces,
    normalizePhone,
    validatePhoneField,
    validateFullNameField
} = require('../../services/validators');

function requireCustomer(req, res) {
    if (!req.session.userId) {
        res.redirect('/login');
        return false;
    }
    if (Number(req.session.roleId) !== 3) {
        res.status(403).send('Chỉ tài khoản khách hàng mới được sử dụng chức năng này.');
        return false;
    }
    return true;
}

async function getCurrentUser(userId) {
    const [rows] = await db.execute(
        'SELECT user_id, username, full_name, email, phone, address FROM users WHERE user_id = ?',
        [userId]
    );
    return rows[0];
}

module.exports = {
    getProfile: async (req, res) => {
        if (!requireCustomer(req, res)) return;
        try {
            const profileUser = await getCurrentUser(req.session.userId);
            res.render('client/pages/profile', {
                profileUser,
                success: req.query.success || null,
                error: req.query.error || null,
                passwordSuccess: req.query.password_success || null,
                passwordError: req.query.password_error || null
            });
        } catch (error) {
            console.error('Lỗi tải profile:', error);
            res.status(500).send('Lỗi tải trang hồ sơ');
        }
    },

    updateProfile: async (req, res) => {
        if (!requireCustomer(req, res)) return;
        try {
            const fullName = collapseSpaces(req.body.full_name);
            const phone = normalizePhone(req.body.phone);
            const address = collapseSpaces(req.body.address);

            const nameError = validateFullNameField(fullName);
            const phoneError = validatePhoneField(phone);

            if (nameError || phoneError || !address) {
                const profileUser = await getCurrentUser(req.session.userId);
                profileUser.full_name = fullName;
                profileUser.phone = phone;
                profileUser.address = address;
                return res.status(400).render('client/pages/profile', {
                    profileUser,
                    success: null,
                    error: nameError || phoneError || 'Vui lòng nhập địa chỉ mặc định.',
                    passwordSuccess: null,
                    passwordError: null
                });
            }

            const [duplicatedPhone] = await db.execute(
                'SELECT user_id FROM users WHERE phone = ? AND user_id <> ? LIMIT 1',
                [phone, req.session.userId]
            );
            if (duplicatedPhone.length > 0) {
                const profileUser = await getCurrentUser(req.session.userId);
                profileUser.full_name = fullName;
                profileUser.phone = phone;
                profileUser.address = address;
                return res.status(400).render('client/pages/profile', {
                    profileUser,
                    success: null,
                    error: 'Số điện thoại đã được tài khoản khác sử dụng.',
                    passwordSuccess: null,
                    passwordError: null
                });
            }

            await db.execute(
                'UPDATE users SET full_name = ?, phone = ?, address = ? WHERE user_id = ?',
                [fullName, phone, address, req.session.userId]
            );
            req.session.full_name = fullName;
            res.redirect('/profile?success=1');
        } catch (error) {
            console.error('Lỗi cập nhật profile:', error);
            res.redirect('/profile?error=' + encodeURIComponent('Không thể cập nhật hồ sơ.'));
        }
    },

    changePassword: async (req, res) => {
        if (!requireCustomer(req, res)) return;
        try {
            const currentPassword = req.body.current_password || '';
            const newPassword = req.body.new_password || '';
            const confirmPassword = req.body.confirm_password || '';

            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.redirect('/profile?password_error=' + encodeURIComponent('Vui lòng nhập đầy đủ thông tin đổi mật khẩu.'));
            }
            if (newPassword.length < 8 || newPassword.length > 60) {
                return res.redirect('/profile?password_error=' + encodeURIComponent('Mật khẩu mới phải có từ 8 đến 60 ký tự.'));
            }
            if (newPassword !== confirmPassword) {
                return res.redirect('/profile?password_error=' + encodeURIComponent('Mật khẩu xác nhận không khớp.'));
            }

            const [[user]] = await db.execute('SELECT password FROM users WHERE user_id = ?', [req.session.userId]);
            if (!user) return res.redirect('/login');

            const ok = await bcrypt.compare(currentPassword, user.password);
            if (!ok) {
                return res.redirect('/profile?password_error=' + encodeURIComponent('Mật khẩu hiện tại không đúng.'));
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashed, req.session.userId]);
            res.redirect('/profile?password_success=1');
        } catch (error) {
            console.error('Lỗi đổi mật khẩu:', error);
            res.redirect('/profile?password_error=' + encodeURIComponent('Không thể đổi mật khẩu.'));
        }
    }
};
