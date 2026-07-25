const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboard1Analytics, getVisualsAnalytics } = require('../controllers/analyticsController');

// Route for Executive Summary / Dashboard1 Analytics
router.get('/dashboard1', protect, getDashboard1Analytics);

// Route for Visual / Heatmaps / Trends Analytics
router.get('/visuals', protect, getVisualsAnalytics);

module.exports = router;
