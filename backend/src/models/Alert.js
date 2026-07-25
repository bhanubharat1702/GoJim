const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['dropout', 'payment_due', 'lead_followup', 'plan_expiry', 'custom', 'birthday', 'payment_overdue', 'unpaid_salary', 'trainer_conflict', 'milestone'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  relatedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  relatedLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDismissed: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    default: ''
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

alertSchema.index({ gymOwner: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ gymOwner: 1, type: 1 });

module.exports = mongoose.model('Alert', alertSchema);
