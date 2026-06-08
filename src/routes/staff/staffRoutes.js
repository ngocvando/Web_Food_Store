const express = require('express');
const router = express.Router();
const staffController = require('../../controllers/staff/staffController');

// Middleware kiểm tra quyền nhân viên (role_id = 2)
const isStaff = (req, res, next) => {
    if (req.session && (req.session.roleId === 2 || req.session.roleId === 1)) {
        return next();
    }
    res.status(403).send("Truy cập bị từ chối: Bạn không có quyền nhân viên.");
};

router.use(isStaff);

router.get('/dashboard', staffController.getDashboard);
router.get('/orders', staffController.getOrders);
router.post('/orders/update-status', staffController.updateOrderStatus);
router.post('/orders/confirm-payment', staffController.confirmPayment);
router.get('/menu', staffController.getMenu);

module.exports = router;
