const express = require('express');
const router = express.Router();
const foodController   = require('../../controllers/client/foodController');
const orderController  = require('../../controllers/client/orderController');
const reviewController = require('../../controllers/client/reviewController');
const profileController = require('../../controllers/client/profileController');
const { requireCustomer } = require('../../middlewares/auth');

// Trang chủ & thực đơn
router.get('/',          foodController.getHome);
router.get('/thuc-don',  foodController.getMenu);
router.get('/mon-an/:id', foodController.getDishDetail);

// Checkout & đặt hàng
router.get('/checkout',        requireCustomer, orderController.getCheckout);
router.post('/checkout/apply-coupon', requireCustomer, orderController.applyCoupon);
router.post('/checkout/remove-coupon', requireCustomer, orderController.removeCoupon);
router.post('/checkout',       requireCustomer, orderController.postOrder);
router.get('/order-success',   requireCustomer, orderController.getOrderSuccess);
router.get('/my-orders',       requireCustomer, orderController.getMyOrders);
router.get('/order/:id/invoice', requireCustomer, orderController.printInvoice);
router.post('/order/cancel',   requireCustomer, orderController.cancelOrder);

// Profile khách hàng
router.get('/profile', requireCustomer, profileController.getProfile);
router.post('/profile', requireCustomer, profileController.updateProfile);
router.post('/profile/change-password', requireCustomer, profileController.changePassword);

// Đánh giá
router.post('/review', requireCustomer, reviewController.postReview);

module.exports = router;
