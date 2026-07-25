const mongoose = require('mongoose');

const TrainerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  specialties: {
    type: [String],
    required: [true, 'Please add at least one specialty']
  },
  experienceStartDate: {
    type: Date,
    required: [true, 'Please add experience start date']
  },
  phone: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  salary: {
    type: Number,
    default: 0
  },
  trainerType: {
    type: String,
    enum: ['Normal Trainer', 'PT Trainer', 'PT + Trainer'],
    default: 'Normal Trainer'
  },
  commission: {
    type: Number,
    default: 0
  },
  shiftStart: {
    type: String,
    default: '06:00'
  },
  shiftEnd: {
    type: String,
    default: '22:00'
  },
  timeSlot: {
    type: String,
    default: ''
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  gymOwner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
TrainerSchema.index({ gymOwner: 1, name: 1 });
TrainerSchema.index({ gymOwner: 1, status: 1 });
TrainerSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Trainer', TrainerSchema);
