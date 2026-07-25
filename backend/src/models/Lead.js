const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  source: {
    type: String,
    enum: ['walk-in', 'referral', 'social_media', 'website', 'other'],
    default: 'walk-in'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'trial', 'joined', 'lost'],
    default: 'new'
  },
  interestedPlan: {
    type: String,
    default: 'undecided'
  },
  planAmount: {
    type: Number,
    default: 0
  },
  trialTaken: {
    type: Boolean,
    default: false
  },
  dob: {
    type: Date,
    default: null
  },
  followUpDate: {
    type: Date,
    default: null
  },
  statusHistory: [
    {
      status: { type: String },
      date: { type: Date, default: Date.now }
    }
  ],
  lastContactDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    default: null
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

leadSchema.index({ gymOwner: 1, status: 1 });
leadSchema.index({ gymOwner: 1, followUpDate: 1 });

module.exports = mongoose.model('Lead', leadSchema);
