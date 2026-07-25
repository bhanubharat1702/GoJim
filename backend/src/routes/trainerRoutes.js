const express = require('express');
const { getTrainers, createTrainer, updateTrainer, deleteTrainer, toggleTrainerStatus } = require('../controllers/trainerController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTrainers)
  .post(createTrainer);

router.route('/:id')
  .put(updateTrainer)
  .delete(deleteTrainer);

router.patch('/:id/toggle-status', toggleTrainerStatus);

module.exports = router;
