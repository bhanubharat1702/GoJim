const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    unique: true
  },
  monthlyPrice: {
    type: Number,
    required: [true, 'Monthly price is required'],
    min: 0
  },
  yearlyPrice: {
    type: Number,
    required: [true, 'Yearly price is required'],
    min: 0
  },
  maxClients: {
    type: Number,
    required: [true, 'Maximum clients is required'],
    min: 1
  },
  maxTrainers: {
    type: Number,
    required: [true, 'Maximum trainers is required'],
    min: 1
  },
  maxStaff: {
    type: Number,
    required: [true, 'Maximum staff is required'],
    min: 1
  },
  trialDays: {
    type: Number,
    required: [true, 'Trial days is required'],
    default: 14,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  features: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
