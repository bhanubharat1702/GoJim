const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  getMe, 
  updateProfile, 
  updatePassword, 
  sendOTP, 
  verifyOTP, 
  selectSubscriptionPlan, 
  getLatestBroadcast,
  verifyOwnerSubscriptionRazorpay,
  expireSubscriptionForTest,
  verifyUPI,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);
router.put('/subscribe-plan', protect, selectSubscriptionPlan);
router.post('/razorpay/verify-owner', protect, verifyOwnerSubscriptionRazorpay);
router.post('/test/expire-subscription', protect, expireSubscriptionForTest);
router.get('/broadcast/latest', protect, getLatestBroadcast);
router.post('/verify-upi', protect, verifyUPI);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

module.exports = router;
