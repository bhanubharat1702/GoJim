const mongoose = require('mongoose');

const SubscriptionTransactionSchema = new mongoose.Schema({
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gymName: {
    type: String,
    required: true,
    trim: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  planName: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  paymentMethod: {
    type: String,
    default: 'razorpay'
  },
  razorpayOrderId: {
    type: String,
    default: ''
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

SubscriptionTransactionSchema.index({ gymOwner: 1, transactionDate: -1 });

module.exports = mongoose.model('SubscriptionTransaction', SubscriptionTransactionSchema);
