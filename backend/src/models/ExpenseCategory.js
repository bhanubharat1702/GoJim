const mongoose = require('mongoose');

const ExpenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true
  },
  titles: {
    type: [String],
    default: []
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure a gym owner cannot create duplicate categories
ExpenseCategorySchema.index({ name: 1, gymOwner: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseCategory', ExpenseCategorySchema);
