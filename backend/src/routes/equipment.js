const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getEquipments,
  getEquipment,
  createEquipment,
  updateEquipment,
  updateEquipmentStatus,
  deleteEquipment
} = require('../controllers/equipmentController');

// All equipment routes require authentication
router.use(protect);

router.route('/')
  .get(getEquipments)
  .post(createEquipment);

router.route('/:id')
  .get(getEquipment)
  .put(updateEquipment)
  .delete(deleteEquipment);

router.route('/:id/status')
  .patch(updateEquipmentStatus);

module.exports = router;
