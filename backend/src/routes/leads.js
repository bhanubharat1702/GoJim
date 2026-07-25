const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getLeads, getLead, createLead, updateLead, deleteLead, getFollowUps, getLeadStats } = require('../controllers/leadController');

router.get('/followups', protect, getFollowUps);
router.get('/stats', protect, getLeadStats);
router.route('/').get(protect, getLeads).post(protect, authorize('owner', 'staff'), createLead);
router.route('/:id').get(protect, getLead).put(protect, authorize('owner', 'staff'), updateLead).delete(protect, authorize('owner'), deleteLead);

module.exports = router;
