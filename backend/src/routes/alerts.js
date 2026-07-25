const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAlerts, markAsRead, dismissAlert, generateAlerts, getAlertCounts } = require('../controllers/alertController');

router.get('/counts', protect, getAlertCounts);
router.post('/generate', protect, generateAlerts);
router.put('/:id/read', protect, markAsRead);
router.put('/:id/dismiss', protect, dismissAlert);
router.get('/', protect, getAlerts);

module.exports = router;
