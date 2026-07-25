const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  durationMonths: {
    type: Number,
    required: true,
    min: 1
  },
  actualPrice: {
    type: Number,
    required: true
  },
  discountedPrice: {
    type: Number,
    required: true
  },
  hasPtPricing: {
    type: Boolean,
    default: false
  },
  ptActualPrice: {
    type: Number,
    default: 0
  },
  ptDiscountedPrice: {
    type: Number,
    default: 0
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);
