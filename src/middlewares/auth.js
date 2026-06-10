const authMiddleware = {
    // Kiểm tra đã đăng nhập chưa
    isLoggedIn: (req, res, next) => {
        if (req.session.userId) return next();
        res.redirect('/login');
    },

    // Chỉ khách hàng (role_id = 3) được dùng giỏ hàng/checkout/đơn cá nhân
    requireCustomer: (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect('/login');
        }
        if (Number(req.session.roleId) !== 3) {
            return res.status(403).send('Chỉ tài khoản khách hàng mới được sử dụng chức năng mua hàng.');
        }
        next();
    },

    // Kiểm tra quyền Admin
    isAdmin: (req, res, next) => {
        if (req.session && Number(req.session.roleId) === 1) {
            return next();
        }
        res.status(403).send("Truy cập bị từ chối: Bạn không có quyền Admin.");
    }
};

module.exports = authMiddleware;
