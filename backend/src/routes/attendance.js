const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  checkIn, 
  getTodayAttendance, 
  getAttendance, 
  getAttendanceStats, 
  markAbsent,
  unmarkAttendance,
  checkOut
} = require('../controllers/attendanceController');

router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut); // New checkout endpoint
router.delete('/absent', protect, markAbsent);
router.delete('/unmark', protect, unmarkAttendance); // New unmark endpoint
router.get('/today', protect, getTodayAttendance);
router.get('/stats', protect, getAttendanceStats);
router.get('/', protect, getAttendance);

module.exports = router;
