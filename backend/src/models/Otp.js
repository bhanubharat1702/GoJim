const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: false,
    index: true
  },
  email: {
    type: String,
    required: false,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 240 // TTL index: automatically deleted after 4 minutes
  }
});

module.exports = mongoose.model('Otp', otpSchema);
