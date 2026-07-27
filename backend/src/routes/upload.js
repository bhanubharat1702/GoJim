const express = require('express');
const router = express.Router();
const { uploadSingleImage, deleteSingleImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// Upload image route (allows optionally protected or open uploads for logos/avatars)
router.post('/image', uploadSingleImage);

// Delete image route (protected)
router.delete('/image', protect, deleteSingleImage);

module.exports = router;
