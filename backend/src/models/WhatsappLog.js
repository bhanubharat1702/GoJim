const mongoose = require('mongoose');

const WhatsappLogSchema = new mongoose.Schema({
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  variables: {
    type: Map,
    of: String
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  messageId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WhatsappLog', WhatsappLogSchema);
