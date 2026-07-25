const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendTemplate, sendCustom, getLog, listTemplates, verifyWebhook, handleWebhook } = require('../controllers/whatsappController');

router.get('/templates', protect, listTemplates);
router.get('/log', protect, getLog);
router.post('/send', protect, sendTemplate);
router.post('/send-custom', protect, sendCustom);

// Webhook endpoints (verification and event receipt)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

module.exports = router;
