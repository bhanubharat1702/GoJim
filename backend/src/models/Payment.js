const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: 0
  },
  plan: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'bank_transfer', 'other', 'razorpay'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'partial', 'cancelled'],
    default: 'paid'
  },
  dueDate: {
    type: Date
  },
  newExpiry: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  isPtPayment: {
    type: Boolean,
    default: false
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

paymentSchema.index({ gymOwner: 1, member: 1, paymentDate: -1 });
paymentSchema.index({ gymOwner: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
