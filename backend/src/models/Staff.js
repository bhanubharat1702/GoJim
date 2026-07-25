const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Please add a role']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true
  },
  salary: {
    type: Number,
    default: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  shiftStart: {
    type: String,
    default: '09:00'
  },
  shiftEnd: {
    type: String,
    default: '18:00'
  },
  timeSlot: {
    type: String,
    default: ''
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
StaffSchema.index({ gymOwner: 1, name: 1 });
StaffSchema.index({ gymOwner: 1, role: 1 });
StaffSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Staff', StaffSchema);
