const express = require('express');
const router = express.Router();
const { 
  getStaff, 
  createStaff, 
  updateStaff, 
  deleteStaff,
  toggleStaffStatus 
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .get(getStaff)
  .post(createStaff);

router.route('/:id')
  .put(updateStaff)
  .delete(deleteStaff);

router.patch('/:id/toggle-status', toggleStaffStatus);

module.exports = router;
