const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Broadcast title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Broadcast message is required'],
    trim: true
  },
  targetAudience: {
    type: String,
    enum: ['All Gyms', 'Specific Plan', 'Selected Gyms'],
    required: true
  },
  recipients: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    default: 'Sent'
  },
  intensity: {
    type: String,
    enum: ['Normal', 'Warning', 'Danger'],
    default: 'Normal'
  }
}, { 
  timestamps: { createdAt: 'sentDate', updatedAt: false } 
});

module.exports = mongoose.model('Broadcast', BroadcastSchema);
