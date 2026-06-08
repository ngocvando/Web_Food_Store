const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { ensureOrderReviewSchema } = require('../services/schemaHelper');
const { sendPasswordOtp, isMailConfigured } = require('../services/mailService');
const {
    cleanInput,
    collapseSpaces,
    normalizeEmail,
    normalizePhone,
    normalizeVoucherCode,
    validateEmailField,
    validatePhoneField,
    validateFullNameField
} = require('../services/validators');

function validateRegisterInput(body) {
    const username = cleanInput(body.username);
    const password = body.password || '';
    const full_name = collapseSpaces(body.full_name);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);

    if (!/^[A-Za-z0-9_]{4,30}$/.test(username)) {
        return { error: 'Tên đăng nhập phải có 4-30 ký tự, chỉ gồm chữ, số và dấu _.', data: { username, full_name, email, phone } };
    }
    if (password.length < 8 || password.length > 60) {
        return { error: 'Mật khẩu phải có từ 8 đến 60 ký tự.', data: { username, full_name, email, phone } };
    }
    const nameError = validateFullNameField(full_name);
    if (nameError) {
        return { error: nameError, data: { username, full_name, email, phone } };
    }
    const emailError = validateEmailField(email);
    if (emailError) {
        return { error: emailError, data: { username, full_name, email, phone } };
    }
    const phoneError = validatePhoneField(phone);
    if (phoneError) {
        return { error: phoneError, data: { username, full_name, email, phone } };
    }
    return { error: null, data: { username, password, full_name, email, phone } };
}

const authController = {
    // Xử lý Đăng ký
    register: async (req, res) => {
        try {
            const validated = validateRegisterInput(req.body);
            if (validated.error) {
                return res.status(400).render('client/pages/register', {
                    error: validated.error,
                    old: validated.data
                });
            }

            const { username, password, full_name, email, phone } = validated.data;
            const existed = await User.findByIdentifier(username) || await User.findByIdentifier(email) || await User.findByIdentifier(phone);
            if (existed) {
                return res.status(400).render('client/pages/register', {
                    error: 'Tên đăng nhập, email hoặc số điện thoại đã được sử dụng.',
                    old: { username, full_name, email, phone }
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({
                username, password: hashedPassword, full_name, email, phone, address: null
            });
            res.redirect('/login');
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            res.status(500).render('client/pages/register', {
                error: 'Lỗi khi đăng ký tài khoản. Vui lòng thử lại.',
                old: req.body || {}
            });
        }
    },

    // Xử lý Đăng nhập
    login: async (req, res) => {
        const username = cleanInput(req.body.username);
        const password = req.body.password || '';
        try {
            await ensureOrderReviewSchema();
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(404).render('client/pages/login', {
                    error: 'Người dùng không tồn tại. Vui lòng kiểm tra lại tên đăng nhập.',
                    old: { username }
                });
            }
            if (user.is_active !== undefined && Number(user.is_active) === 0) {
                return res.status(403).render('client/pages/login', {
                    error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
                    old: { username }
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).render('client/pages/login', {
                    error: 'Mật khẩu không chính xác. Vui lòng nhập lại.',
                    old: { username }
                });
            }

            // Lưu thông tin vào session
            req.session.userId = user.user_id;
            req.session.roleId = user.role_id;
            req.session.username = user.username;

            res.redirect('/'); // Về trang chủ sau khi đăng nhập
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            res.status(500).render('client/pages/login', {
                error: 'Lỗi server khi đăng nhập. Vui lòng thử lại.',
                old: { username }
            });
        }
    },

    // Hiển thị form nhập email quên mật khẩu
    getForgotPassword: async (req, res) => {
        try {
            await ensureOrderReviewSchema();
        } catch (e) {
            console.warn('Không thể kiểm tra schema OTP:', e.message);
        }
        res.render('client/pages/forgot-password', {
            error: null,
            success: null,
            old: {},
            mailConfigured: isMailConfigured()
        });
    },

    // Gửi OTP về email
    postForgotPassword: async (req, res) => {
        const email = normalizeEmail(req.body.email);
        const emailError = validateEmailField(email);

        try {
            await ensureOrderReviewSchema();

            if (emailError) {
                return res.status(400).render('client/pages/forgot-password', {
                    error: emailError,
                    success: null,
                    old: { email },
                    mailConfigured: isMailConfigured()
                });
            }

            if (!isMailConfigured()) {
                return res.status(500).render('client/pages/forgot-password', {
                    error: 'Hệ thống chưa cấu hình Gmail App Password. Vui lòng cấu hình MAIL_USER và MAIL_PASS trong file .env.',
                    success: null,
                    old: { email },
                    mailConfigured: false
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).render('client/pages/forgot-password', {
                    error: 'Không tìm thấy tài khoản với email này.',
                    success: null,
                    old: { email },
                    mailConfigured: isMailConfigured()
                });
            }

            if (user.is_active !== undefined && Number(user.is_active) === 0) {
                return res.status(403).render('client/pages/forgot-password', {
                    error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
                    success: null,
                    old: { email },
                    mailConfigured: isMailConfigured()
                });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expire = new Date(Date.now() + 5 * 60 * 1000);

            await User.savePasswordOtp(user.user_id, otp, expire);
            await sendPasswordOtp(email, otp);

            req.session.resetEmail = email;
            req.session.resetUserId = user.user_id;

            return res.redirect('/verify-otp');
        } catch (error) {
            console.error('Lỗi gửi OTP quên mật khẩu:', error);
            return res.status(500).render('client/pages/forgot-password', {
                error: 'Không thể gửi mã OTP. Vui lòng kiểm tra cấu hình Gmail App Password hoặc thử lại sau.',
                success: null,
                old: { email },
                mailConfigured: isMailConfigured()
            });
        }
    },

    // Hiển thị form nhập OTP
    getVerifyOtp: (req, res) => {
        if (!req.session.resetUserId || !req.session.resetEmail) {
            return res.redirect('/forgot-password');
        }
        res.render('client/pages/verify-otp', {
            error: null,
            success: null,
            email: req.session.resetEmail
        });
    },

    // Xác thực OTP
    postVerifyOtp: async (req, res) => {
        const otp = cleanInput(req.body.otp).replace(/[^0-9]/g, '');
        const userId = req.session.resetUserId;
        const email = req.session.resetEmail;

        if (!userId || !email) {
            return res.redirect('/forgot-password');
        }

        try {
            await ensureOrderReviewSchema();
            const user = await User.findByEmail(email);
            if (!user || Number(user.user_id) !== Number(userId)) {
                return res.redirect('/forgot-password');
            }

            if (!/^[0-9]{6}$/.test(otp)) {
                return res.status(400).render('client/pages/verify-otp', {
                    error: 'Mã OTP phải gồm đúng 6 chữ số.',
                    success: null,
                    email
                });
            }

            if (Number(user.otp_attempts || 0) >= 3) {
                await User.clearPasswordOtp(user.user_id);
                req.session.resetUserId = null;
                req.session.resetEmail = null;
                return res.status(429).render('client/pages/forgot-password', {
                    error: 'Bạn đã nhập sai OTP quá 3 lần. Vui lòng yêu cầu mã mới.',
                    success: null,
                    old: { email },
                    mailConfigured: isMailConfigured()
                });
            }

            if (!user.otp_code || !user.otp_expire) {
                return res.status(400).render('client/pages/verify-otp', {
                    error: 'Mã OTP không tồn tại hoặc đã bị hủy. Vui lòng yêu cầu mã mới.',
                    success: null,
                    email
                });
            }

            if (new Date(user.otp_expire).getTime() < Date.now()) {
                await User.clearPasswordOtp(user.user_id);
                return res.status(400).render('client/pages/forgot-password', {
                    error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
                    success: null,
                    old: { email },
                    mailConfigured: isMailConfigured()
                });
            }

            if (user.otp_code !== otp) {
                await User.increaseOtpAttempts(user.user_id);
                return res.status(400).render('client/pages/verify-otp', {
                    error: 'Mã OTP không chính xác. Bạn được nhập tối đa 3 lần.',
                    success: null,
                    email
                });
            }

            req.session.otpVerified = true;
            return res.redirect('/reset-password');
        } catch (error) {
            console.error('Lỗi xác thực OTP:', error);
            return res.status(500).render('client/pages/verify-otp', {
                error: 'Lỗi server khi xác thực OTP. Vui lòng thử lại.',
                success: null,
                email
            });
        }
    },

    // Hiển thị form đặt mật khẩu mới
    getResetPassword: (req, res) => {
        if (!req.session.resetUserId || !req.session.otpVerified) {
            return res.redirect('/forgot-password');
        }
        res.render('client/pages/reset-password', {
            error: null,
            success: null
        });
    },

    // Cập nhật mật khẩu mới sau khi OTP hợp lệ
    postResetPassword: async (req, res) => {
        const userId = req.session.resetUserId;
        const newPassword = req.body.new_password || '';
        const confirmPassword = req.body.confirm_password || '';

        if (!userId || !req.session.otpVerified) {
            return res.redirect('/forgot-password');
        }

        try {
            if (newPassword.length < 8 || newPassword.length > 60) {
                return res.status(400).render('client/pages/reset-password', {
                    error: 'Mật khẩu mới phải có từ 8 đến 60 ký tự.',
                    success: null
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).render('client/pages/reset-password', {
                    error: 'Mật khẩu xác nhận không khớp.',
                    success: null
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.updatePassword(userId, hashedPassword);
            await User.clearPasswordOtp(userId);

            req.session.resetUserId = null;
            req.session.resetEmail = null;
            req.session.otpVerified = null;

            return res.render('client/pages/login', {
                error: null,
                old: {},
                success: 'Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
            });
        } catch (error) {
            console.error('Lỗi đặt lại mật khẩu:', error);
            return res.status(500).render('client/pages/reset-password', {
                error: 'Lỗi server khi đặt lại mật khẩu. Vui lòng thử lại.',
                success: null
            });
        }
    },

    // Đăng xuất
    logout: (req, res) => {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/login');
        });
    }
};

module.exports = authController;