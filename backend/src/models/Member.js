const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Member name is required'],
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'male'
  },
  age: {
    type: Number,
    min: 10,
    max: 100
  },
  dob: {
    type: Date,
    default: null
  },
  photo: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    default: 'monthly'
  },
  planAmount: {
    type: Number,
    default: 0
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  planExpiry: {
    type: Date,
    required: true
  },
  lastAttendance: {
    type: Date,
    default: null
  },
  totalAttendance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'exited', 'inactive'],
    default: 'active'
  },
  membershipStatus: {
    type: String,
    enum: ['Active', 'Expired', 'Exited', 'Inactive'],
    default: 'Active'
  },
  membershipStartDate: {
    type: Date,
    default: Date.now
  },
  membershipEndDate: {
    type: Date,
    default: null
  },
  renewalAmount: {
    type: Number,
    default: 0
  },
  assignedTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    default: null
  },
  timeSlot: {
    type: String,
    default: ''
  },
  emergencyContact: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save hook to synchronize status -> membershipStatus, planExpiry -> membershipEndDate, planAmount -> renewalAmount
memberSchema.pre('save', function(next) {
  // Sync status -> membershipStatus
  if (this.status) {
    const capitalized = this.status.charAt(0).toUpperCase() + this.status.slice(1);
    if (['Active', 'Expired', 'Exited', 'Inactive'].includes(capitalized)) {
      this.membershipStatus = capitalized;
    }
  } else if (this.membershipStatus) {
    this.status = this.membershipStatus.toLowerCase();
  }

  // Sync joinDate -> membershipStartDate
  if (this.joinDate) {
    this.membershipStartDate = this.joinDate;
  } else if (this.membershipStartDate) {
    this.joinDate = this.membershipStartDate;
  }

  // Sync planExpiry -> membershipEndDate
  if (this.planExpiry) {
    this.membershipEndDate = this.planExpiry;
  } else if (this.membershipEndDate) {
    this.planExpiry = this.membershipEndDate;
  }

  // Sync planAmount -> renewalAmount
  if (this.planAmount !== undefined && (this.renewalAmount === 0 || this.renewalAmount === undefined)) {
    this.renewalAmount = this.planAmount;
  } else if (this.renewalAmount !== undefined && (this.planAmount === 0 || this.planAmount === undefined)) {
    this.planAmount = this.renewalAmount;
  }

  next();
});

// Virtual: Check if member is at dropout risk (inactive > 5 days)
memberSchema.virtual('isDropoutRisk').get(function() {
  if (!this.lastAttendance || !this.lastAttendance.getTime) return true;
  const daysSinceLastAttendance = Math.floor(
    (Date.now() - this.lastAttendance.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceLastAttendance > 5;
});

// Virtual: Days until plan expiry
memberSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.planExpiry || !this.planExpiry.getTime) return 0;
  return Math.ceil(
    (this.planExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
});

memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

// Indexes for fast lookups (Scoped to Gym Owner)
memberSchema.index({ gymOwner: 1, phone: 1 });
memberSchema.index({ gymOwner: 1, status: 1 });
memberSchema.index({ gymOwner: 1, planExpiry: 1 });
memberSchema.index({ gymOwner: 1, membershipStatus: 1 });
memberSchema.index({ gymOwner: 1, membershipEndDate: 1 });

// Indexes for performance
memberSchema.index({ gymOwner: 1, name: 1 });
memberSchema.index({ gymOwner: 1, phone: 1 });
memberSchema.index({ gymOwner: 1, status: 1 });
memberSchema.index({ gymOwner: 1, createdAt: -1 });
memberSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Member', memberSchema);
