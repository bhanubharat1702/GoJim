const User = require('../models/User');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Trainer = require('../models/Trainer');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const Plan = require('../models/Plan');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const AuditLog = require('../models/AuditLog');
const PlatformSettings = require('../models/PlatformSettings');
const Broadcast = require('../models/Broadcast');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');

// Helper to seed default subscription plans and settings if they don't exist
const seedDefaults = async () => {
  try {
    // 1. Seed plans
    const planCount = await SubscriptionPlan.countDocuments({});
    if (planCount === 0) {
      await SubscriptionPlan.create([
        {
          name: 'Bronze Plan',
          monthlyPrice: 999,
          yearlyPrice: 9999,
          maxClients: 150,
          maxTrainers: 5,
          maxStaff: 5,
          trialDays: 14,
          description: 'For boutique or small local gyms',
          features: ['Leads Module', 'Payments Module', 'Attendance Module'],
          status: 'Active'
        },
        {
          name: 'Silver Plan',
          monthlyPrice: 1999,
          yearlyPrice: 19999,
          maxClients: 500,
          maxTrainers: 15,
          maxStaff: 15,
          trialDays: 14,
          description: 'For growing medium-sized gym clubs',
          features: ['Leads Module', 'Payments Module', 'Attendance Module', 'Trainer Module', 'Staff Module'],
          status: 'Active'
        },
        {
          name: 'Gold Plan',
          monthlyPrice: 3999,
          yearlyPrice: 39999,
          maxClients: 2000,
          maxTrainers: 50,
          maxStaff: 50,
          trialDays: 30,
          description: 'For elite, multi-location gym chains',
          features: ['Leads Module', 'Payments Module', 'Attendance Module', 'Trainer Module', 'Staff Module', 'Equipment Module'],
          status: 'Active'
        }
      ]);
      console.log('🌱 Seeded default Subscription Plans.');
    }

    // 2. Seed settings
    const settingsCount = await PlatformSettings.countDocuments({});
    if (settingsCount === 0) {
      await PlatformSettings.create({
        appName: 'goJim',
        supportEmail: 'support@gojim.com',
        supportPhone: '+91 98765 43210',
        defaultTrialDays: 14,
        maintenanceMode: false
      });
      console.log('🌱 Seeded default Platform Settings.');
    }

    // 3. Update existing owners without subscriptionPlan or subscriptionStatus
    const defaultPlan = await SubscriptionPlan.findOne({ name: 'Silver Plan' });
    if (defaultPlan) {
      const ownersToUpdate = await User.find({ role: 'owner', subscriptionPlan: { $exists: false } });
      for (const owner of ownersToUpdate) {
        owner.subscriptionPlan = defaultPlan._id;
        owner.subscriptionStatus = 'Active';
        owner.subscriptionStart = owner.createdAt || new Date();
        owner.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        owner.subscriptionAmount = defaultPlan.monthlyPrice;
        await owner.save();
      }
    }
  } catch (error) {
    console.error('Error seeding defaults:', error.message);
  }
};

// Seed immediately on controller load
seedDefaults();

// @desc    Get dashboard summary statistics & trends
// @route   GET /api/super-admin/stats
exports.getStats = async (req, res) => {
  try {
    await seedDefaults(); // Safely ensure defaults are set

    // KPIs
    const totalGyms = await User.countDocuments({ role: 'owner' });
    const activeGyms = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Active', isActive: true });
    const trialGyms = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Trial', isActive: true });
    const expiredGyms = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Expired' });
    const suspendedGyms = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Suspended' });

    // Monthly revenue: Sum of subscriptionAmount of active owners
    const activeOwners = await User.find({ role: 'owner', subscriptionStatus: 'Active' });
    const monthlyRevenue = activeOwners.reduce((acc, curr) => acc + (curr.subscriptionAmount || 0), 0);

    // New signups this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newSignups = await User.countDocuments({ role: 'owner', createdAt: { $gte: startOfMonth } });

    // Trend calculations (Last 12 Months)
    const growthTrend = [];
    const revenueTrend = [];

    // Generate dates for the last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      // Count signups in this month
      const signupsCount = await User.countDocuments({ role: 'owner', createdAt: { $gte: start, $lt: end } });

      // Calculate revenue up to this month
      // For a beautiful simulation, let's take the active gyms created up to this point
      const gymsUpToMonth = await User.find({
        role: 'owner',
        createdAt: { $lt: end },
        subscriptionStatus: { $ne: 'Suspended' }
      });
      const revSum = gymsUpToMonth.reduce((acc, curr) => {
        // If they created recently, maybe they are in trial (0 revenue) or active
        if (curr.subscriptionStatus === 'Active') {
          return acc + (curr.subscriptionAmount || 1999);
        }
        return acc;
      }, 0);

      growthTrend.push({ label, value: signupsCount });
      revenueTrend.push({ label, value: revSum || 0 });
    }

    // Attention Required Lists
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Expiring within 7 days
    const expiring7Days = await User.find({
      role: 'owner',
      subscriptionStatus: { $in: ['Active', 'Trial'] },
      $or: [
        { subscriptionEnd: { $gte: new Date(), $lte: sevenDaysFromNow } },
        { subscriptionTrialEnds: { $gte: new Date(), $lte: sevenDaysFromNow } }
      ]
    }).populate('subscriptionPlan');

    // Expiring within 30 days (excluding 7 days)
    const expiring30Days = await User.find({
      role: 'owner',
      subscriptionStatus: { $in: ['Active', 'Trial'] },
      $or: [
        { subscriptionEnd: { $gt: sevenDaysFromNow, $lte: thirtyDaysFromNow } },
        { subscriptionTrialEnds: { $gt: sevenDaysFromNow, $lte: thirtyDaysFromNow } }
      ]
    }).populate('subscriptionPlan');

    // Recently suspended gyms (last 30 days)
    const recentlySuspended = await User.find({
      role: 'owner',
      $or: [
        { subscriptionStatus: 'Suspended' },
        { isActive: false }
      ]
    }).sort({ updatedAt: -1 }).limit(10).populate('subscriptionPlan');

    // Recent registrations (last 30 days)
    const recentRegistrations = await User.find({
      role: 'owner'
    }).sort({ createdAt: -1 }).limit(10).populate('subscriptionPlan');

    // Recent platform subscription transactions
    const recentTransactions = await SubscriptionTransaction.find({})
      .populate('gymOwner', 'name email')
      .sort({ transactionDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalGyms,
          activeGyms,
          trialGyms,
          expiredGyms,
          suspendedGyms,
          monthlyRevenue,
          newSignups
        },
        trends: {
          growthTrend,
          revenueTrend
        },
        attentionRequired: {
          expiring7Days,
          expiring30Days,
          recentlySuspended,
          recentRegistrations
        },
        recentTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all gym owners with search and filters
// @route   GET /api/super-admin/owners
exports.getGymOwners = async (req, res) => {
  try {
    const { search, status, plan, creationDate, subscriptionStatus } = req.query;
    let query = { role: 'owner' };

    // Search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { gymName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (status) {
      if (status === 'Active') query.isActive = true;
      if (status === 'Suspended') query.isActive = false;
    }

    if (subscriptionStatus) {
      query.subscriptionStatus = subscriptionStatus;
    }

    if (plan) {
      query.subscriptionPlan = plan;
    }

    if (creationDate) {
      const start = new Date(creationDate);
      const end = new Date(creationDate);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    const owners = await User.find(query).select('+password +plainPassword').populate('subscriptionPlan').sort({ createdAt: -1 });

    const ownersWithStats = await Promise.all(
      owners.map(async (owner) => {
        if (!owner.plainPassword && owner.password && !owner.password.startsWith('$2')) {
          owner.plainPassword = owner.password;
          await owner.save();
        }

        let isExpired = false;
        const now = new Date();

        if (owner.subscriptionStatus === 'Expired') {
          isExpired = true;
        } else if (owner.subscriptionStatus === 'Trial') {
          let trialEnd = owner.subscriptionTrialEnds ? new Date(owner.subscriptionTrialEnds) : null;
          if (!trialEnd && owner.createdAt) {
            trialEnd = new Date(new Date(owner.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
          }
          if (trialEnd && trialEnd <= now) {
            isExpired = true;
          }
        } else if (owner.subscriptionStatus === 'Active') {
          let end = owner.subscriptionEnd ? new Date(owner.subscriptionEnd) : null;
          if (!end && owner.createdAt) {
            end = new Date(new Date(owner.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
          }
          if (end && end <= now) {
            isExpired = true;
          }
        }

        if (isExpired && owner.subscriptionStatus !== 'Expired') {
          owner.subscriptionStatus = 'Expired';
          await owner.save();
        }

        const clientCount = await Member.countDocuments({ gymOwner: owner._id });
        const trainerCount = await Trainer.countDocuments({ gymOwner: owner._id });
        const staffCount = await Staff.countDocuments({ gymOwner: owner._id });
        return {
          ...owner.toObject(),
          clientCount,
          trainerCount,
          staffCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: ownersWithStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed gym owner profile and operational metrics
// @route   GET /api/super-admin/owners/:id
exports.getGymDetails = async (req, res) => {
  try {
    const owner = await User.findById(req.params.id).select('+password +plainPassword').populate('subscriptionPlan');
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    if (!owner.plainPassword && owner.password && !owner.password.startsWith('$2')) {
      owner.plainPassword = owner.password;
      await owner.save();
    }

    let isExpired = false;
    const now = new Date();

    if (owner.subscriptionStatus === 'Expired') {
      isExpired = true;
    } else if (owner.subscriptionStatus === 'Trial') {
      let trialEnd = owner.subscriptionTrialEnds ? new Date(owner.subscriptionTrialEnds) : null;
      if (!trialEnd && owner.createdAt) {
        trialEnd = new Date(new Date(owner.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      if (trialEnd && trialEnd <= now) {
        isExpired = true;
      }
    } else if (owner.subscriptionStatus === 'Active') {
      let end = owner.subscriptionEnd ? new Date(owner.subscriptionEnd) : null;
      if (!end && owner.createdAt) {
        end = new Date(new Date(owner.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      if (end && end <= now) {
        isExpired = true;
      }
    }

    if (isExpired && owner.subscriptionStatus !== 'Expired') {
      owner.subscriptionStatus = 'Expired';
      await owner.save();
    }

    // Counts
    const totalClients = await Member.countDocuments({ gymOwner: owner._id });
    const totalActiveMembers = await Member.countDocuments({ gymOwner: owner._id, membershipStatus: 'Active' });
    const totalTrainers = await Trainer.countDocuments({ gymOwner: owner._id });
    const totalStaff = await Staff.countDocuments({ gymOwner: owner._id });

    // Recent activity list
    const recentAuditLogs = await AuditLog.find({
      $or: [
        { gymOwner: owner._id },
        { affectedEntity: owner.gymName, gymOwner: { $exists: false } }
      ]
    }).sort({ date: -1 }).limit(10);

    // Get owner transactions
    const ownerTransactions = await SubscriptionTransaction.find({ gymOwner: owner._id })
      .sort({ transactionDate: -1 });

    // Mock storage usage (typically calculated on server uploads size)
    const storageUsage = `${(totalClients * 0.05 + totalTrainers * 0.1).toFixed(2)} MB`;

    res.status(200).json({
      success: true,
      data: {
        gymInfo: owner,
        metrics: {
          totalClients,
          totalActiveMembers,
          totalTrainers,
          totalStaff,
          storageUsage,
          lastLogin: owner.lastLogin,
          lastActivity: owner.lastActivity
        },
        auditLogs: recentAuditLogs,
        transactions: ownerTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new Gym Owner account
// @route   POST /api/super-admin/owners
exports.createGymOwner = async (req, res) => {
  try {
    const { name, email, password, phone, gymName, subscriptionPlanId, subscriptionStatus, trialDays, billingCycle } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Selected subscription plan not found' });
    }

    // Calculate dates
    const start = new Date();
    const cycle = billingCycle || 'monthly';
    let end = new Date();
    let trialEnds;
    const days = typeof trialDays === 'number' ? trialDays : (typeof plan.trialDays === 'number' ? plan.trialDays : 14);

    if (subscriptionStatus === 'Trial') {
      trialEnds = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      end = trialEnds;
    } else {
      if (cycle === 'yearly') {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
    }

    const newOwner = new User({
      name,
      email,
      password,
      plainPassword: password,
      phone,
      gymName,
      role: 'owner',
      subscriptionPlan: plan._id,
      subscriptionStatus: subscriptionStatus || 'Trial',
      subscriptionStart: start,
      subscriptionEnd: end,
      subscriptionTrialEnds: trialEnds,
      billingCycle: cycle,
      subscriptionAmount: subscriptionStatus === 'Active' ? (cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) : 0,
      isActive: true,
      capacity: plan.maxClients,
      trialUsed: subscriptionStatus === 'Trial' ? true : false
    });

    // Make gymOwner point to itself
    newOwner.gymOwner = newOwner._id;
    await newOwner.save();

    // Log the creation
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;
    await AuditLog.create({
      action: 'Account Created',
      performedBy: req.user.name,
      affectedEntity: gymName,
      gymOwner: newOwner._id,
      details: `Account created on ${formattedDate}`
    });

    res.status(201).json({ success: true, data: newOwner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Gym Owner profile details
// @route   PUT /api/super-admin/owners/:id/details
exports.updateGymOwnerDetails = async (req, res) => {
  try {
    const { name, gymName, phone, email, whatsappConfig } = req.body;

    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }
    }

    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const oldGymName = owner.gymName;
    
    const changes = [];
    if (name && name !== owner.name) changes.push(`name changed to "${name}"`);
    if (gymName && gymName !== owner.gymName) changes.push(`gymName changed to "${gymName}"`);
    if (phone && phone !== owner.phone) changes.push(`phone changed to "${phone}"`);
    if (email && email !== owner.email) changes.push(`email changed to "${email}"`);

    owner.name = name || owner.name;
    owner.gymName = gymName || owner.gymName;
    owner.phone = phone || owner.phone;
    owner.email = email || owner.email;

    if (whatsappConfig) {
      owner.whatsappConfig = whatsappConfig;
      changes.push(`WhatsApp Business API settings updated`);

      // Sync WhatsApp config to Supabase
      try {
        const { supabase } = require('../config/supabase');
        const { encrypt } = require('../utils/crypto');
        const ownerId = owner._id;

        const { data: existing } = await supabase
          .from('whatsapp_configs')
          .select('id')
          .eq('gym_owner_id', ownerId.toString())
          .maybeSingle();

        const dbPayload = {
          phone_number_id: whatsappConfig.phoneNumberId || '',
          access_token: whatsappConfig.accessToken ? encrypt(whatsappConfig.accessToken) : '',
          business_account_id: whatsappConfig.businessAccountId || '',
          is_verified: whatsappConfig.isVerified || false,
          automations: whatsappConfig.automations || {
            paymentReminder: { 
              enabled: true, 
              daysBefore: 3, 
              templateText: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳" 
            },
            comebackNudge: { 
              enabled: true, 
              daysInactive: 5, 
              templateText: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️" 
            },
            welcomeMessage: { 
              enabled: true, 
              templateText: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀" 
            },
            birthdayWish: { 
              enabled: true, 
              templateText: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪" 
            },
            newLeadNudge: {
              enabled: true,
              templateText: "Hi {member_name}! Thanks for checking out {gym_name}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪"
            },
            leadFollowup: {
              enabled: true,
              daysInactive: 2,
              templateText: "Hi {member_name}! Just checking back in. Did you have any questions about {gym_name}? We have a special discount if you sign up this week! 💸💪"
            },
            leadFollowupReminder: {
              enabled: true,
              templateText: "Hello {member_name}! This is a reminder for your scheduled follow-up session/call with {gym_name} today. Let's discuss your fitness goals! 📅🏋️"
            },
            salaryPayout: {
              enabled: true,
              templateText: "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}"
            }
          },
          updated_at: new Date().toISOString()
        };

        if (existing) {
          await supabase
            .from('whatsapp_configs')
            .update(dbPayload)
            .eq('gym_owner_id', ownerId.toString());
        } else {
          await supabase
            .from('whatsapp_configs')
            .insert({
              gym_owner_id: ownerId.toString(),
              ...dbPayload
            });
        }
        console.log(`✅ [Super Admin] Synced updated WhatsApp config to Supabase for owner ${ownerId}`);
      } catch (supabaseErr) {
        console.error('⚠️ [Super Admin] Failed to sync WhatsApp config update to Supabase:', supabaseErr.message);
      }
    }

    await owner.save();

    await AuditLog.create({
      action: 'Gym Updated',
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      gymOwner: owner._id,
      details: changes.length > 0 ? `Updated: ${changes.join(', ')}` : `Updated basic profile settings for ${owner.email}`
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password of a Gym Owner
// @route   PUT /api/super-admin/owners/:id/password
exports.changeGymOwnerPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 5) {
      return res.status(400).json({ success: false, message: 'Password must be at least 5 characters long' });
    }

    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    owner.password = password;
    owner.plainPassword = password;
    await owner.save();

    await AuditLog.create({
      action: 'Password Changed',
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      gymOwner: owner._id,
      details: `Password changed for gym owner (${owner.email}) by Super Admin`
    });

    res.status(200).json({ success: true, message: 'Gym owner password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Toggle Gym Owner active status (Suspend/Activate)
// @route   PUT /api/super-admin/owners/:id/status
exports.toggleGymOwnerStatus = async (req, res) => {
  try {
    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    owner.isActive = !owner.isActive;
    if (!owner.isActive) {
      owner.subscriptionStatus = 'Suspended';
    } else {
      owner.subscriptionStatus = owner.subscriptionTrialEnds && owner.subscriptionTrialEnds > new Date() ? 'Trial' : 'Active';
    }
    await owner.save();

    const action = owner.isActive ? 'Gym Activated' : 'Gym Suspended';
    await AuditLog.create({
      action,
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      gymOwner: owner._id,
      details: `${action} account access for owner ${owner.email}`
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Extend Gym Trial period
// @route   PUT /api/super-admin/owners/:id/trial
exports.extendTrial = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) {
      return res.status(400).json({ success: false, message: 'Please specify a positive number of days' });
    }

    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    // Set trial end date
    const currentTrialEnd = owner.subscriptionTrialEnds && owner.subscriptionTrialEnds > new Date() ? owner.subscriptionTrialEnds : new Date();
    const newTrialEnd = new Date(currentTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);

    owner.subscriptionTrialEnds = newTrialEnd;
    owner.subscriptionEnd = newTrialEnd;
    owner.subscriptionStatus = 'Trial';
    owner.isActive = true;
    await owner.save();

    await AuditLog.create({
      action: 'Subscription Extended',
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      gymOwner: owner._id,
      details: `Extended trial by ${days} days. New trial end date: ${newTrialEnd.toLocaleDateString()}`
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Subscription Plan for a Gym Owner
// @route   PUT /api/super-admin/owners/:id/plan
exports.changePlan = async (req, res) => {
  try {
    const { planId, billingCycle, status } = req.body;

    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'subscription plan not found' });
    }

    owner.subscriptionPlan = plan._id;
    owner.capacity = plan.maxClients; // update client capacity constraint
    owner.billingCycle = billingCycle || 'monthly';

    const end = new Date();
    if (owner.billingCycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    let finalStatus = status;
    if (finalStatus === 'Trial' && owner.trialUsed) {
      finalStatus = 'Active';
    }

    if (finalStatus === 'Trial') {
      owner.subscriptionStatus = 'Trial';
      owner.subscriptionStart = new Date();
      const trialDays = typeof plan.trialDays === 'number' ? plan.trialDays : 14;
      owner.subscriptionTrialEnds = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      owner.subscriptionEnd = owner.subscriptionTrialEnds;
      owner.subscriptionAmount = 0;
      owner.trialUsed = true;
    } else {
      owner.subscriptionStatus = 'Active';
      owner.subscriptionStart = new Date();
      owner.subscriptionEnd = end;
      owner.subscriptionTrialEnds = undefined;
      owner.subscriptionAmount = owner.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    }

    owner.isActive = true;
    await owner.save();

    await AuditLog.create({
      action: 'Plan Updated',
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      gymOwner: owner._id,
      details: `Switched plan to ${plan.name} (${status || 'Active'})`
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Gym Owner and purge all data
// @route   DELETE /api/super-admin/owners/:id
exports.deleteGymOwner = async (req, res) => {
  try {
    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    const gymName = owner.gymName;

    // Dynamic imports for other models to support clean purging
    const Alert = require('../models/Alert');
    const Lead = require('../models/Lead');
    const Equipment = require('../models/Equipment');
    const WhatsappLog = require('../models/WhatsappLog');
    const ExpenseCategory = require('../models/ExpenseCategory');

    // Purge database sub-collections for this owner
    await Member.deleteMany({ gymOwner: owner._id });
    await Payment.deleteMany({ gymOwner: owner._id });
    await Trainer.deleteMany({ gymOwner: owner._id });
    await Staff.deleteMany({ gymOwner: owner._id });
    await Attendance.deleteMany({ gymOwner: owner._id });
    await Expense.deleteMany({ gymOwner: owner._id });
    await Plan.deleteMany({ gymOwner: owner._id });
    await Alert.deleteMany({ gymOwner: owner._id });
    await Lead.deleteMany({ gymOwner: owner._id });
    await Equipment.deleteMany({ gymOwner: owner._id });
    await WhatsappLog.deleteMany({ gymOwner: owner._id });
    await ExpenseCategory.deleteMany({ gymOwner: owner._id });

    // Delete the owner user and all staff/trainers belonging to this gym owner
    await User.deleteMany({
      $or: [
        { _id: owner._id },
        { gymOwner: owner._id }
      ]
    });

    // Purge all audit logs associated with this owner or gym name to prevent leakage
    await AuditLog.deleteMany({
      $or: [
        { gymOwner: owner._id },
        { affectedEntity: gymName }
      ]
    });

    // Delete all WhatsApp configs & logs from Supabase
    try {
      const { supabase } = require('../config/supabase');
      if (supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        await supabase.from('whatsapp_configs').delete().eq('gym_owner_id', owner._id.toString());
        await supabase.from('whatsapp_logs').delete().eq('gym_owner_id', owner._id.toString());
        console.log(`✅ Purged Supabase WhatsApp records for gym owner: ${owner._id}`);
      }
    } catch (supabaseErr) {
      console.error('⚠️ Failed to purge Supabase data during owner deletion:', supabaseErr.message);
    }

    await AuditLog.create({
      action: 'Gym Deleted',
      performedBy: req.user.name,
      affectedEntity: 'System Kernel',
      details: `Purged tenant database records permanently for: ${owner.email} (Gym: ${gymName})`
    });

    res.status(200).json({ success: true, message: 'Gym owner and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Impersonate a Gym Owner
// @route   POST /api/super-admin/owners/:id/impersonate
exports.impersonateGym = async (req, res) => {
  try {
    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Gym owner not found' });
    }

    // Reset other owner's impersonation status first
    await User.updateMany({ isBeingImpersonated: true }, { isBeingImpersonated: false });

    // Mark this owner as being impersonated
    owner.isBeingImpersonated = true;
    await owner.save();

    // Generate JWT token for the gym owner with impersonated flag
    const token = owner.getSignedJwtToken({ isImpersonated: true });

    // Log the impersonation action
    await AuditLog.create({
      action: 'Impersonation Started',
      performedBy: req.user.name,
      affectedEntity: owner.gymName,
      details: `Super Admin started session impersonating gym owner: ${owner.email}`
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        gymName: owner.gymName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log impersonation exit
// @route   POST /api/super-admin/audit-logs/impersonation-exit
exports.logImpersonationExit = async (req, res) => {
  try {
    const { ownerId } = req.body;
    if (ownerId) {
      await User.findByIdAndUpdate(ownerId, { isBeingImpersonated: false });
    } else {
      // Safety reset: clear all if ownerId not provided
      await User.updateMany({ isBeingImpersonated: true }, { isBeingImpersonated: false });
    }

    await AuditLog.create({
      action: 'Impersonation Ended',
      performedBy: req.user.name,
      affectedEntity: 'System Kernel',
      details: 'Super Admin exited gym owner impersonation session'
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SUBSCRIPTION PLANS MANAGEMENT
// ==========================================

// @desc    Get all subscription plans
// @route   GET /api/super-admin/plans
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({}).sort({ monthlyPrice: 1 });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new subscription plan
// @route   POST /api/super-admin/plans
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { name, monthlyPrice, yearlyPrice, maxClients, maxTrainers, maxStaff, trialDays, description, features, status } = req.body;

    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ success: false, message: 'Plan name already exists' });
    }

    const newPlan = await SubscriptionPlan.create({
      name,
      monthlyPrice,
      yearlyPrice,
      maxClients,
      maxTrainers,
      maxStaff,
      trialDays,
      description,
      features,
      status: status || 'Active'
    });

    await AuditLog.create({
      action: 'Plan Created',
      performedBy: req.user.name,
      affectedEntity: name,
      details: `Created new subscription plan with monthly price: ₹${monthlyPrice}`
    });

    res.status(201).json({ success: true, data: newPlan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an existing subscription plan
// @route   PUT /api/super-admin/plans/:id
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { name, monthlyPrice, yearlyPrice, maxClients, maxTrainers, maxStaff, trialDays, description, features, status } = req.body;

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'subscription plan not found' });
    }

    plan.name = name || plan.name;
    plan.monthlyPrice = monthlyPrice !== undefined ? monthlyPrice : plan.monthlyPrice;
    plan.yearlyPrice = yearlyPrice !== undefined ? yearlyPrice : plan.yearlyPrice;
    plan.maxClients = maxClients !== undefined ? maxClients : plan.maxClients;
    plan.maxTrainers = maxTrainers !== undefined ? maxTrainers : plan.maxTrainers;
    plan.maxStaff = maxStaff !== undefined ? maxStaff : plan.maxStaff;
    plan.trialDays = trialDays !== undefined ? trialDays : plan.trialDays;
    plan.description = description || plan.description;
    plan.features = features || plan.features;
    plan.status = status || plan.status;

    await plan.save();

    await AuditLog.create({
      action: 'Plan Updated',
      performedBy: req.user.name,
      affectedEntity: plan.name,
      details: `Modified configurations for subscription plan: ${plan.name}`
    });

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a subscription plan
// @route   DELETE /api/super-admin/plans/:id
exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'subscription plan not found' });
    }

    // Check if any gyms are using this plan
    const usageCount = await User.countDocuments({ subscriptionPlan: plan._id });
    if (usageCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete plan. It is currently assigned to ${usageCount} gym(s).` });
    }

    const planName = plan.name;
    await SubscriptionPlan.findByIdAndDelete(plan._id);

    await AuditLog.create({
      action: 'Plan Deleted',
      performedBy: req.user.name,
      affectedEntity: planName,
      details: `Deleted plan: ${planName}`
    });

    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SUBSCRIPTIONS MANAGEMENT
// ==========================================

// @desc    Get all subscriptions stats and list
// @route   GET /api/super-admin/subscriptions
exports.getSubscriptions = async (req, res) => {
  try {
    const { status, plan } = req.query;
    let query = { role: 'owner' };

    if (status) {
      query.subscriptionStatus = status;
    }
    if (plan) {
      query.subscriptionPlan = plan;
    }

    const subscriptions = await User.find(query).populate('subscriptionPlan').sort({ createdAt: -1 });

    // Calculate subscription summary KPIs
    const activeSubs = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Active' });
    const trialSubs = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Trial' });
    const expiredSubs = await User.countDocuments({ role: 'owner', subscriptionStatus: 'Expired' });

    // Monthly Recurring Revenue: sum of active plans price
    const activeUsers = await User.find({ role: 'owner', subscriptionStatus: 'Active' });
    const mrr = activeUsers.reduce((acc, curr) => acc + (curr.subscriptionAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        list: subscriptions,
        summary: {
          activeSubs,
          trialSubs,
          expiredSubs,
          mrr
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all platform transactions
// @route   GET /api/super-admin/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }
    if (plan) {
      query.plan = plan;
    }
    if (search) {
      query.$or = [
        { gymName: { $regex: search, $options: 'i' } },
        { planName: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await SubscriptionTransaction.find(query)
      .populate('gymOwner', 'name email phone')
      .sort({ transactionDate: -1 });

    // Summary calculations
    const totalTransactionsCount = await SubscriptionTransaction.countDocuments({});
    const totalRevenue = await SubscriptionTransaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const revenueSum = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        list: transactions,
        summary: {
          totalCount: totalTransactionsCount,
          totalRevenue: revenueSum
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// PLATFORM SETTINGS, BROADCASTS & AUDIT LOGS
// ==========================================

// @desc    Get platform configurations and metadata
// @route   GET /api/super-admin/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = await PlatformSettings.create({
        appName: 'goJim',
        supportEmail: 'support@gojim.com',
        supportPhone: '+91 98765 43210',
        defaultTrialDays: 14,
        maintenanceMode: false
      });
    }

    // Broadcasts history
    const broadcasts = await Broadcast.find({}).sort({ sentDate: -1 }).limit(20);

    // Audit logs
    const auditLogs = await AuditLog.find({}).sort({ date: -1 }).limit(100);

    // Analytics calculations
    // 1. Feature usage counts
    const leadsCount = await Member.countDocuments({}); // leads/members representation
    const paymentsCount = await Payment.countDocuments({});
    const attendanceCount = await Attendance.countDocuments({});
    const trainerCount = await Trainer.countDocuments({});
    const staffCount = await Staff.countDocuments({});
    const expensesCount = await Expense.countDocuments({});

    const featuresList = [
      { name: 'Leads Module', count: leadsCount },
      { name: 'Payments Module', count: paymentsCount },
      { name: 'Attendance Module', count: attendanceCount },
      { name: 'Trainer Module', count: trainerCount },
      { name: 'Staff Module', count: staffCount },
      { name: 'Equipment Module', count: expensesCount }
    ];

    const sortedFeatures = [...featuresList].sort((a, b) => b.count - a.count);

    // 2. Total logins
    const users = await User.find({ role: 'owner' });
    const totalLogins = users.reduce((acc, curr) => acc + (curr.loginCount || 0), 0);

    // 3. Average Daily Active Gyms (active in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyActiveGyms = await User.countDocuments({ role: 'owner', lastActivity: { $gte: oneDayAgo } });

    // 4. Top active gyms
    const topActiveGyms = await User.find({ role: 'owner' })
      .sort({ loginCount: -1 })
      .limit(5)
      .populate('subscriptionPlan');

    res.status(200).json({
      success: true,
      data: {
        settings,
        broadcasts,
        auditLogs,
        analytics: {
          mostUsedFeatures: sortedFeatures,
          totalLogins,
          averageDailyActiveGyms: dailyActiveGyms,
          topActiveGyms
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update platform settings
// @route   PUT /api/super-admin/settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      appName, supportEmail, supportPhone, defaultTrialDays, maintenanceMode,
      equipmentCategories, staffRoles, specializations, expenseCategories
    } = req.body;

    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = new PlatformSettings({});
    }

    settings.appName = appName || settings.appName;
    settings.supportEmail = supportEmail || settings.supportEmail;
    settings.supportPhone = supportPhone || settings.supportPhone;
    settings.defaultTrialDays = defaultTrialDays !== undefined ? defaultTrialDays : settings.defaultTrialDays;
    settings.maintenanceMode = maintenanceMode !== undefined ? maintenanceMode : settings.maintenanceMode;

    if (equipmentCategories !== undefined) settings.equipmentCategories = equipmentCategories;
    if (staffRoles !== undefined) settings.staffRoles = staffRoles;
    if (specializations !== undefined) settings.specializations = specializations;
    if (expenseCategories !== undefined) settings.expenseCategories = expenseCategories;

    await settings.save();

    await AuditLog.create({
      action: 'Settings Updated',
      performedBy: req.user.name,
      affectedEntity: 'System Kernel',
      details: 'Updated global Platform Settings'
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update global feature flags
// @route   PUT /api/super-admin/settings/features
exports.updateFeatureFlags = async (req, res) => {
  try {
    const { featureFlags } = req.body;

    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = new PlatformSettings({});
    }

    settings.featureFlags = {
      ...settings.featureFlags,
      ...featureFlags
    };

    await settings.save();

    await AuditLog.create({
      action: 'Feature Flags Updated',
      performedBy: req.user.name,
      affectedEntity: 'System Kernel',
      details: `Modified global feature availability flags: ${JSON.stringify(featureFlags)}`
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send broadcast announcement to target audience
// @route   POST /api/super-admin/broadcasts
exports.sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetAudience, selectedGyms, specificPlanId, intensity } = req.body;

    let recipients = [];
    if (targetAudience === 'All Gyms') {
      const owners = await User.find({ role: 'owner' });
      recipients = owners.map(o => o.gymName);
    } else if (targetAudience === 'Specific Plan') {
      const plan = await SubscriptionPlan.findById(specificPlanId);
      const owners = await User.find({ role: 'owner', subscriptionPlan: specificPlanId });
      recipients = owners.map(o => `${o.gymName} (Plan: ${plan.name})`);
    } else if (targetAudience === 'Selected Gyms') {
      // selectedGyms is an array of IDs
      const owners = await User.find({ _id: { $in: selectedGyms } });
      recipients = owners.map(o => o.gymName);
    }

    const broadcast = await Broadcast.create({
      title,
      message,
      targetAudience,
      recipients,
      status: 'Sent',
      intensity: intensity || 'Normal'
    });

    await AuditLog.create({
      action: 'Broadcast Sent',
      performedBy: req.user.name,
      affectedEntity: 'Broadcast Hub',
      details: `Sent announcement "${title}" to ${recipients.length} target recipients (${targetAudience})`
    });

    res.status(201).json({ success: true, data: broadcast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get public settings (appName, support details)
// @route   GET /api/super-admin/settings/public
exports.getPublicSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = await PlatformSettings.create({
        appName: 'goJim',
        supportEmail: 'support@gojim.com',
        supportPhone: '+91 98765 43210',
        defaultTrialDays: 14,
        maintenanceMode: false
      });
    }
    res.json({
      success: true,
      data: {
        appName: settings.appName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        maintenanceMode: settings.maintenanceMode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a broadcast announcement
// @route   DELETE /api/super-admin/broadcasts/:id
exports.deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    await Broadcast.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: 'Broadcast Deleted',
      performedBy: req.user.name,
      affectedEntity: 'Broadcast Hub',
      details: `Deleted broadcast announcement: "${broadcast.title}"`
    });

    res.status(200).json({ success: true, message: 'Broadcast deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
