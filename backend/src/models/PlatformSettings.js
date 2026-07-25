const mongoose = require('mongoose');

const PlatformSettingsSchema = new mongoose.Schema({
  appName: {
    type: String,
    default: 'goJim',
    required: true
  },
  supportEmail: {
    type: String,
    default: 'support@gojim.com',
    required: true
  },
  supportPhone: {
    type: String,
    default: '+1234567890',
    required: true
  },
  defaultTrialDays: {
    type: Number,
    default: 14,
    required: true
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
    required: true
  },
  featureFlags: {
    leads: { type: Boolean, default: true },
    equipment: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
    trainer: { type: Boolean, default: true },
    staff: { type: Boolean, default: true }
  },
  equipmentCategories: {
    type: [String],
    default: ['Cardio', 'Strength', 'Free Weights', 'Accessories']
  },
  staffRoles: {
    type: [String],
    default: ['Trainer', 'Manager', 'Staff', 'Admin']
  },
  specializations: {
    type: [String],
    default: ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit']
  },
  expenseCategories: {
    type: [{
      name: String,
      titles: [String]
    }],
    default: [
      { name: 'Rent', titles: ["Gym Rent", "Parking Rent", "Storage Rent", "Other"] },
      { name: 'Utilities', titles: ["Electricity Bill", "Water Bill", "Generator Fuel", "Other"] },
      { name: 'Maintenance', titles: ["Treadmill Repair", "Cable Replacement", "Machine Service", "AC Repair", "Other"] },
      { name: 'Marketing', titles: ["Instagram Ads", "Banner Printing", "Referral Campaign", "Other"] },
      { name: 'Cleaning', titles: ["Cleaning Supplies", "Sanitizer", "Washroom Supplies", "Other"] },
      { name: 'Internet', titles: ["WiFi Bill", "Software Subscription", "CCTV Subscription", "Other"] },
      { name: 'Equipment', titles: ["New Dumbbells", "Yoga Mats", "Resistance Bands", "Other"] },
      { name: 'Miscellaneous', titles: ["Furniture Repair", "Festival Decoration", "Office Supplies", "Other"] }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
