const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getGymOwners,
  getGymDetails,
  createGymOwner,
  updateGymOwnerDetails,
  changeGymOwnerPassword,
  toggleGymOwnerStatus,
  extendTrial,
  changePlan,
  deleteGymOwner,
  impersonateGym,
  logImpersonationExit,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptions,
  getTransactions,
  getSettings,
  updateSettings,
  updateFeatureFlags,
  sendBroadcast,
  getPublicSettings,
  deleteBroadcast
} = require('../controllers/superAdminController');

// Public route for landing page to fetch subscription plans and public settings
router.get('/plans/public', getSubscriptionPlans);
router.get('/settings/public', getPublicSettings);

// All routes require authentication and superadmin authorization
router.use(protect, authorize('superadmin'));

// Overview Stats
router.get('/stats', getStats);

// Gym Owners Management
router.get('/owners', getGymOwners);
router.post('/owners', createGymOwner);
router.get('/owners/:id', getGymDetails);
router.put('/owners/:id/details', updateGymOwnerDetails);
router.put('/owners/:id/password', changeGymOwnerPassword);
router.put('/owners/:id/status', toggleGymOwnerStatus);
router.put('/owners/:id/trial', extendTrial);
router.put('/owners/:id/plan', changePlan);
router.delete('/owners/:id', deleteGymOwner);

// Impersonation
router.post('/owners/:id/impersonate', impersonateGym);
router.post('/audit-logs/impersonation-exit', logImpersonationExit);

// Subscription Plans CRUD
router.get('/plans', getSubscriptionPlans);
router.post('/plans', createSubscriptionPlan);
router.put('/plans/:id', updateSubscriptionPlan);
router.delete('/plans/:id', deleteSubscriptionPlan);

// Subscriptions & Transactions Registry
router.get('/subscriptions', getSubscriptions);
router.get('/transactions', getTransactions);

// Platform Settings & Audit Logs & Analytics
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.put('/settings/features', updateFeatureFlags);
router.post('/broadcasts', sendBroadcast);
router.delete('/broadcasts/:id', deleteBroadcast);

module.exports = router;
