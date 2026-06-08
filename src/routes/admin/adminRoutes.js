const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const orderController = require('../../controllers/admin/orderController');
const { isAdmin } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');

router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Dishes
router.get('/dishes',              adminController.getManageDishes);
router.get('/dishes/add',          adminController.getAddDish);
router.post('/dishes/add',         upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery_images', maxCount: 8 }]), adminController.postAddDish);
router.get('/dishes/edit/:id',     adminController.getEditDish);
router.post('/dishes/edit/:id',    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery_images', maxCount: 8 }]), adminController.postEditDish);
router.get('/dishes/delete/:id',   adminController.deleteDish);

// Categories
router.get('/categories',          adminController.getCategories);
router.post('/categories/add',     adminController.postAddCategory);
router.get('/categories/delete/:id', adminController.deleteCategory);

// Combos
router.get('/combos',              adminController.getCombos);
router.post('/combos/add',         upload.single('image'), adminController.postAddCombo);
router.get('/combos/delete/:id',   adminController.deleteCombo);

// Orders
router.get('/orders',              orderController.getAllOrders);
router.post('/orders/update-status', orderController.updateStatus);
router.post('/orders/confirm-payment', orderController.confirmPayment);

// Reviews
router.get('/reviews',             adminController.getReviews);
router.post('/reviews/delete/:id', adminController.deleteReview);
router.post('/reviews/toggle/:id', adminController.toggleReview);

// Users
router.get('/users',               adminController.getUsers);
router.post('/users/update-role',  adminController.updateUserRole);
router.post('/users/delete/:id', adminController.deleteUser);
router.post('/users/toggle/:id', adminController.toggleUserStatus);


// Vouchers
router.get('/vouchers',            adminController.getVouchers);
router.post('/vouchers/add',       adminController.postAddVoucher);
router.post('/vouchers/update/:id', adminController.postUpdateVoucher);
router.post('/vouchers/toggle/:id', adminController.toggleVoucher);
router.post('/vouchers/delete/:id', adminController.deleteVoucher);

// Settings / QR
router.get('/settings',            adminController.getSettings);
router.post('/settings',           upload.single('qr_image'), adminController.postSettings);

module.exports = router;
