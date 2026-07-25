const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { 
  createPayment, 
  getPayments, 
  getPaymentStats, 
  getMemberPayments, 
  getPaymentsOverview, 
  deletePayment,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/paymentController');

router.get('/stats', protect, getPaymentStats);
router.get('/overview', protect, getPaymentsOverview);
router.get('/member/:memberId', protect, getMemberPayments);
router.route('/').get(protect, getPayments).post(protect, authorize('owner', 'staff'), createPayment);
router.route('/:id').delete(protect, authorize('owner', 'staff'), deletePayment);

// Razorpay routes
router.post('/razorpay/order', protect, authorize('owner', 'staff'), createRazorpayOrder);
router.post('/razorpay/verify', protect, authorize('owner', 'staff'), verifyRazorpayPayment);

module.exports = router;
