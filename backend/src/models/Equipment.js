const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  equipmentName: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Available', 'Under Maintenance', 'Not Available'],
    default: 'Available'
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index to quickly fetch active equipment for a gym owner
EquipmentSchema.index({ gymOwner: 1, isDeleted: 1 });

module.exports = mongoose.model('Equipment', EquipmentSchema);
