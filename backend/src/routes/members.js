const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMembers, getMember, createMember, updateMember, deleteMember,
  getInactiveMembers, getExpiringMembers, searchByPhone, getMemberStats, toggleMemberStatus, getExpectedRenewals
} = require('../controllers/memberController');

router.get('/stats', protect, getMemberStats);
router.get('/expected-renewals', protect, getExpectedRenewals);
router.get('/inactive', protect, getInactiveMembers);
router.get('/expiring', protect, getExpiringMembers);
router.get('/search/:phone', protect, searchByPhone);


router.patch('/:id/toggle-status', protect, authorize('owner', 'staff'), toggleMemberStatus);
router.route('/').get(protect, getMembers).post(protect, authorize('owner', 'staff'), createMember);
router.route('/:id').get(protect, getMember).put(protect, authorize('owner', 'staff'), updateMember).delete(protect, authorize('owner'), deleteMember);

module.exports = router;
