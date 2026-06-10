const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', (req, res) => res.render('client/pages/login', { error: null, old: {} }));
router.post('/login', authController.login);

router.get('/register', (req, res) => res.render('client/pages/register', { error: null, old: {} }));
router.post('/register', authController.register);

router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

router.get('/verify-otp', authController.getVerifyOtp);
router.post('/verify-otp', authController.postVerifyOtp);

router.get('/reset-password', authController.getResetPassword);
router.post('/reset-password', authController.postResetPassword);

router.get('/logout', authController.logout);

module.exports = router;