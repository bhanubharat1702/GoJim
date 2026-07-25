const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 5,
    select: false
  },
  plainPassword: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['owner', 'staff', 'trainer', 'superadmin'],
    default: 'staff'
  },
  phone: {
    type: String,
    trim: true
  },
  gymName: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    default: 100
  },
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan'
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Trial', 'Expired', 'Suspended'],
    default: 'Trial'
  },
  subscriptionStart: {
    type: Date,
    default: Date.now
  },
  subscriptionEnd: {
    type: Date
  },
  subscriptionTrialEnds: {
    type: Date
  },
  subscriptionAmount: {
    type: Number,
    default: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  lastLogin: {
    type: Date
  },
  lastActivity: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  timeSlots: {
    type: [{
      name: String,
      startTime: String,
      endTime: String,
      activeDays: [String],
      slotType: { type: String, enum: ['Batch', 'Full Day', '24/7'], default: 'Batch' },
      status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
      capacity: Number
    }],
    default: []
  },
  avatar: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true
  },
  instagram: {
    type: String,
    trim: true
  },
  facebook: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deactivationThresholdDays: {
    type: Number,
    default: 60
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  activeSessionId: {
    type: String,
    default: ''
  },
  trainerCompensation: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      normal: { baseSalary: 12000, commission: 0 },
      ptOnly: { baseSalary: 0, commission: 50 },
      ptAndTrainer: { baseSalary: 10000, commission: 40 }
    }
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
  whatsappConfig: {
    phoneNumberId: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    automations: {
      paymentReminder: { 
        enabled: { type: Boolean, default: true }, 
        daysBefore: { type: Number, default: 3 },
        templateText: { type: String, default: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳" }
      },
      comebackNudge: { 
        enabled: { type: Boolean, default: true }, 
        daysInactive: { type: Number, default: 5 },
        templateText: { type: String, default: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️" }
      },
      welcomeMessage: { 
        enabled: { type: Boolean, default: true },
        templateText: { type: String, default: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀" }
      },
      birthdayWish: { 
        enabled: { type: Boolean, default: true },
        templateText: { type: String, default: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪" }
      },
      newLeadNudge: {
        enabled: { type: Boolean, default: true },
        templateText: { type: String, default: "Hi {member_name}! Thanks for checking out {gym_name}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪" }
      },
      leadFollowup: {
        enabled: { type: Boolean, default: true },
        daysInactive: { type: Number, default: 2 },
        templateText: { type: String, default: "Hi {member_name}! Just checking back in. Did you have any questions about {gym_name}? We have a special discount if you sign up this week! 💸💪" }
      },
      leadFollowupReminder: {
        enabled: { type: Boolean, default: true },
        templateText: { type: String, default: "Hello {member_name}! This is a reminder for your scheduled follow-up session/call with {gym_name} today. Let's discuss your fitness goals! 📅🏋️" }
      },
      salaryPayout: {
        enabled: { type: Boolean, default: true },
        templateText: { type: String, default: "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}" }
      }
    }
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trialUsed: {
    type: Boolean,
    default: false
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  upiIds: {
    type: [{
      upiId: { type: String, required: true },
      payeeName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      isDefault: { type: Boolean, default: false }
    }],
    default: []
  },
  isBeingImpersonated: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpire: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getSignedJwtToken = function(extraPayload = {}) {
  return jwt.sign({ id: this._id, role: this.role, ...extraPayload }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

module.exports = mongoose.model('User', userSchema);
