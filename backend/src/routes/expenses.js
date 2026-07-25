const express = require('express');
const router = express.Router();
const { 
  getExpenses, 
  createExpense, 
  deleteExpense,
  getExpenseStats 
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router.get('/stats', getExpenseStats);

router.route('/')
  .get(getExpenses)
  .post(createExpense);

router.route('/:id')
  .delete(deleteExpense);

module.exports = router;
