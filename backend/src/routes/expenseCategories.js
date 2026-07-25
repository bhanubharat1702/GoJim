const express = require('express');
const router = express.Router();
const { 
  getExpenseCategories, 
  createExpenseCategory, 
  updateExpenseCategory, 
  deleteExpenseCategory,
  resetExpenseCategories
} = require('../controllers/expenseCategoryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('owner'));

router.post('/reset', resetExpenseCategories);

router.route('/')
  .get(getExpenseCategories)
  .post(createExpenseCategory);

router.route('/:id')
  .put(updateExpenseCategory)
  .delete(deleteExpenseCategory);

module.exports = router;
