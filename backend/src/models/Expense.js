const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title or description'],
    trim: true
  },
  category: {
    type: String,
    default: 'Other'
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer'],
    default: 'cash'
  },
  date: {
    type: Date,
    default: Date.now
  },
  gymOwner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

ExpenseSchema.index({ gymOwner: 1, date: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
