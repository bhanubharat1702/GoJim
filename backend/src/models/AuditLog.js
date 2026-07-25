const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: String,
    required: true,
    trim: true
  },
  affectedEntity: {
    type: String,
    required: true,
    trim: true
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  details: {
    type: String,
    trim: true
  }
}, { 
  timestamps: { createdAt: 'date', updatedAt: false } 
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
