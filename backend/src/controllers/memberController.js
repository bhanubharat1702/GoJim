const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Trainer = require('../models/Trainer');

// Helper to convert time "HH:MM" to minutes since midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if trainer is compatible with member's preferred slot
const checkTrainerCompatibility = async (trainerId, memberTimeSlotName, gymOwnerId) => {
  if (!trainerId || !memberTimeSlotName) return true; // If no trainer or no slot, compatible by default

  const trainer = await Trainer.findOne({ _id: trainerId, gymOwner: gymOwnerId });
  if (!trainer) return false;

  // If trainer has a specific named time slot
  if (trainer.timeSlot && trainer.timeSlot !== 'custom') {
    // If trainer's named slot matches member's named slot
    return trainer.timeSlot === memberTimeSlotName;
  }

  // If trainer has custom working hours, check if member's slot time range falls entirely within trainer's shift
  const user = await User.findById(gymOwnerId);
  if (!user || !user.timeSlots) return false;

  const memberSlot = user.timeSlots.find(s => s.name === memberTimeSlotName && (s.status === 'Active' || s.status === 'active' || !s.status));
  if (!memberSlot) return true; // If member's slot is not active/configured, fallback to true or handle gracefully

  const mStart = timeToMinutes(memberSlot.startTime);
  const mEnd = timeToMinutes(memberSlot.endTime);
  const tStart = timeToMinutes(trainer.shiftStart || '06:00');
  const tEnd = timeToMinutes(trainer.shiftEnd || '22:00');

  if (tEnd >= tStart) {
    return mStart >= tStart && mEnd <= tEnd;
  } else {
    // Crosses midnight
    return (mStart >= tStart && (mEnd <= tEnd || mEnd > mStart)) || (mStart <= tEnd && mEnd <= tEnd);
  }
};

// Calculate plan expiry based on plan type
const calculateExpiry = (startDate, plan) => {
  const date = new Date(startDate);
  switch (plan) {
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'half-yearly': date.setMonth(date.getMonth() + 6); break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    default: date.setMonth(date.getMonth() + 1);
  }
  return date;
};

// Calculate age based on Date of Birth
const calculateAge = (dob) => {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// Helper to auto-inactivate members who haven't paid for 2 months
// AND auto-deactivate members who haven't visited in X days (deactivationThresholdDays)
const autoInactivateMembers = async (gymOwnerId) => {
  try {
    if (!gymOwnerId) return;

    // 1. Get gym owner settings
    const owner = await User.findById(gymOwnerId);
    const thresholdDays = owner?.deactivationThresholdDays !== undefined ? owner.deactivationThresholdDays : 60;

    // 2. Mark active/expired members as inactive if they haven't attended in deactivationThresholdDays
    const deactivationDate = new Date();
    deactivationDate.setDate(deactivationDate.getDate() - thresholdDays);

    await Member.updateMany(
      {
        gymOwner: gymOwnerId,
        status: { $in: ['active', 'expired'] },
        $or: [
          { lastAttendance: { $lt: deactivationDate } },
          { lastAttendance: null, joinDate: { $lt: deactivationDate } }
        ]
      },
      {
        $set: {
          status: 'inactive',
          membershipStatus: 'Inactive'
        }
      }
    );

    // 4. Reactivate inactive members who are within the threshold (i.e. absent for less than thresholdDays)
    const now = new Date();
    const membersToReactivate = await Member.find({
      gymOwner: gymOwnerId,
      status: 'inactive',
      $or: [
        { lastAttendance: { $gte: deactivationDate } },
        { lastAttendance: null, joinDate: { $gte: deactivationDate } }
      ]
    });

    if (membersToReactivate.length > 0) {
      for (const m of membersToReactivate) {
        const isPlanActive = m.planExpiry && m.planExpiry >= now;
        m.status = isPlanActive ? 'active' : 'expired';
        await m.save();
      }
    }
  } catch (err) {
    console.error('Error in autoInactivateMembers:', err);
  }
};

// @desc    Get all members
// @route   GET /api/members
exports.getMembers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, excludeInactive } = req.query;
    const query = { gymOwner: req.gymOwnerId };

    // Run auto-inactivation
    await autoInactivateMembers(req.gymOwnerId);

    const now = new Date();
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = 'active';
        query.planExpiry = { $gte: now };
      } else if (status === 'expired') {
        query.status = 'active';
        query.planExpiry = { $lt: now };
      } else if (status === 'inactive') {
        query.status = 'inactive';
      } else if (status === 'new') {
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        query.joinDate = { $gte: currentMonthStart };
        query.status = 'active'; // Only active new members
      } else if (status === 'exited') {
        query.status = 'exited';
      }
    } else {
      if (excludeInactive === 'true') {
        query.status = { $nin: ['exited', 'inactive'] };
      } else {
        query.status = { $ne: 'exited' };
      }
    }
    
    if (req.query.plan && req.query.plan !== 'all') query.plan = req.query.plan;
    if (req.query.gender && req.query.gender !== 'all') query.gender = req.query.gender;
    if (search) {
      const mongoose = require('mongoose');
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ _id: search });
      }
    }

    const total = await Member.countDocuments(query);
    const members = await Member.find(query)
      .populate('assignedTrainer', 'name gender')
      .sort(req.query.sort || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      pages: Math.ceil(total / limit),
      page: parseInt(page),
      data: members
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single member
// @route   GET /api/members/:id
exports.getMember = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId })
      .populate('assignedTrainer', 'name phone gender');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create member
// @route   POST /api/members
exports.createMember = async (req, res) => {
  try {
    const { name, phone, dob, gender, joinDate, photo, plan, planAmount, timeSlot, upiId } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, message: 'Membership plan is required' });
    }

    if (phone) {
      const existingMember = await Member.findOne({ phone, gymOwner: req.gymOwnerId });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another member' });
      }
    }

    // Check subscription plan client limit
    const owner = await User.findById(req.gymOwnerId).populate('subscriptionPlan');
    if (owner && owner.subscriptionPlan) {
      const currentClientsCount = await Member.countDocuments({ gymOwner: req.gymOwnerId, status: { $ne: 'exited' } });
      if (currentClientsCount >= owner.subscriptionPlan.maxClients) {
        return res.status(400).json({ 
          success: false, 
          limitReached: true,
          message: `You have reached your plan limit of ${owner.subscriptionPlan.maxClients} clients. Please upgrade your software subscription to add more clients.` 
        });
      }
    }

    // Check trainer compatibility
    if (req.body.assignedTrainer) {
      const isCompatible = await checkTrainerCompatibility(req.body.assignedTrainer, timeSlot, req.gymOwnerId);
      if (!isCompatible) {
        return res.status(400).json({ success: false, message: "Trainer's schedule/shift is not compatible with member's attending time slot." });
      }
    }

    let durationMonths = 1;
    const selectedPlan = await Plan.findOne({ name: plan, gymOwner: req.gymOwnerId });
    if (selectedPlan) {
      durationMonths = selectedPlan.durationMonths;
    } else {
      const lowerPlanName = plan.toLowerCase();
      if (lowerPlanName.includes('year')) {
        durationMonths = 12;
      } else {
        const monthMatch = lowerPlanName.match(/(\d+)\s*month/);
        if (monthMatch) {
          durationMonths = parseInt(monthMatch[1]);
        }
      }
    }

    const start = joinDate ? new Date(joinDate) : new Date();
    const planExpiry = new Date(start);
    planExpiry.setMonth(planExpiry.getMonth() + durationMonths);
    
    const dobValue = dob && dob !== '' ? new Date(dob) : null;
    const age = calculateAge(dobValue);

    const member = await Member.create({
      name, phone, dob: dobValue, gender, age, photo,
      plan: plan || 'monthly',
      planAmount: planAmount || 0,
      joinDate: start, 
      planExpiry, 
      status: 'active', // New members start as active
      assignedTrainer: req.body.assignedTrainer || null,
      timeSlot: timeSlot || '',
      gymOwner: req.gymOwnerId,
      createdBy: req.user.id,
      upiId: upiId || ''
    });

    // Automatically create initial payment record marked as paid
    const isInitialPt = req.body.assignedTrainer ? true : false;
    const initialNotes = req.body.assignedTrainer
      ? 'Initial membership payment recorded automatically (Training + PT).'
      : 'Initial membership payment recorded automatically.';

    await Payment.create({
      member: member._id,
      amount: member.planAmount,
      plan: member.plan,
      paymentDate: start,
      paymentMethod: req.body.paymentMethod || 'cash',
      status: 'paid',
      newExpiry: member.planExpiry,
      notes: initialNotes,
      isPtPayment: isInitialPt,
      receivedBy: req.user.id,
      gymOwner: req.gymOwnerId,
      upiId: upiId || ''
    });

    // Trigger automatic WhatsApp welcome message
    if (member.phone) {
      try {
        const { sendMessage } = require('../utils/whatsappService');
        const formattedExpiry = new Date(planExpiry).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        sendMessage(req.user.id, member.phone, 'welcome_message', {
          name: member.name,
          plan: member.plan,
          expiry: formattedExpiry
        }).catch(err => console.error('Auto welcome WhatsApp error:', err.message));
      } catch (err) {
        console.error('Error in welcome message trigger:', err);
      }
    }

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
exports.updateMember = async (req, res) => {
  try {
    if (req.body.phone) {
      const existingMember = await Member.findOne({
        phone: req.body.phone,
        gymOwner: req.gymOwnerId,
        _id: { $ne: req.params.id }
      });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another member' });
      }
    }

    // Check trainer compatibility on update
    if (req.body.hasOwnProperty('assignedTrainer') || req.body.hasOwnProperty('timeSlot')) {
      const existingMember = await Member.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
      if (!existingMember) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
      
      const trainerId = req.body.hasOwnProperty('assignedTrainer') ? req.body.assignedTrainer : existingMember.assignedTrainer;
      const timeSlot = req.body.hasOwnProperty('timeSlot') ? req.body.timeSlot : existingMember.timeSlot;

      if (trainerId) {
        const isCompatible = await checkTrainerCompatibility(trainerId, timeSlot, req.gymOwnerId);
        if (!isCompatible) {
          return res.status(400).json({ success: false, message: "Trainer's schedule/shift is not compatible with member's attending time slot." });
        }
      }
    }

    if (req.body.hasOwnProperty('dob')) {
      if (req.body.dob === '' || !req.body.dob) {
        req.body.dob = null;
        req.body.age = undefined;
      } else {
        req.body.age = calculateAge(req.body.dob);
      }
    }

    // Sync fields for Expected Renewals compatibility
    if (req.body.status) {
      const capitalized = req.body.status.charAt(0).toUpperCase() + req.body.status.slice(1);
      if (['Active', 'Expired', 'Exited', 'Inactive'].includes(capitalized)) {
        req.body.membershipStatus = capitalized;
      }
    } else if (req.body.membershipStatus) {
      req.body.status = req.body.membershipStatus.toLowerCase();
    }

    if (req.body.joinDate) {
      req.body.membershipStartDate = req.body.joinDate;
    } else if (req.body.membershipStartDate) {
      req.body.joinDate = req.body.membershipStartDate;
    }

    if (req.body.planExpiry) {
      req.body.membershipEndDate = req.body.planExpiry;
    } else if (req.body.membershipEndDate) {
      req.body.planExpiry = req.body.membershipEndDate;
    }

    if (req.body.planAmount !== undefined) {
      req.body.renewalAmount = parseInt(req.body.planAmount) || 0;
    } else if (req.body.renewalAmount !== undefined) {
      req.body.planAmount = parseInt(req.body.renewalAmount) || 0;
    }

    if (req.body.status === 'active') {
      req.body.lastAttendance = new Date();
    }

    const member = await Member.findOneAndUpdate(
      { _id: req.params.id, gymOwner: req.gymOwnerId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findOneAndDelete({ 
      _id: req.params.id, 
      gymOwner: req.gymOwnerId 
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Automatically delete corresponding lead if it exists
    if (member.phone) {
      const Lead = require('../models/Lead');
      await Lead.findOneAndDelete({ 
        phone: member.phone, 
        gymOwner: req.gymOwnerId 
      });
    }

    // Automatically delete attendance details for the member
    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({
      member: req.params.id,
      gymOwner: req.gymOwnerId
    });

    // Automatically delete alert details for the member
    const Alert = require('../models/Alert');
    await Alert.deleteMany({
      relatedMember: req.params.id,
      gymOwner: req.gymOwnerId
    });

    // Optionally delete payments if requested
    if (req.query.deletePayments === 'true') {
      await Payment.deleteMany({
        member: req.params.id,
        gymOwner: req.gymOwnerId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inactive members (dropout risk)
// @route   GET /api/members/inactive
exports.getInactiveMembers = async (req, res) => {
  try {
    const { search } = req.query;
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const query = {
      gymOwner: req.gymOwnerId,
      status: 'inactive'
    };

    if (search) {
      query.$and = [
        { 
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (req.query.plan && req.query.plan !== 'all') query.plan = req.query.plan;
    if (req.query.gender && req.query.gender !== 'all') query.gender = req.query.gender;

    const members = await Member.find(query)
      .populate('assignedTrainer', 'name gender')
      .sort({ lastAttendance: 1 });
    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpiringMembers = async (req, res) => {
  try {
    const { search } = req.query;
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const query = {
      gymOwner: req.gymOwnerId,
      planExpiry: { $lte: threeDaysLater },
      status: { $ne: 'exited' }
    };

    if (search) {
      query.$and = [
        { 
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    if (req.query.plan && req.query.plan !== 'all') query.plan = req.query.plan;
    if (req.query.gender && req.query.gender !== 'all') query.gender = req.query.gender;

    const members = await Member.find(query)
      .populate('assignedTrainer', 'name gender')
      .sort({ planExpiry: 1 });

    const data = await Promise.all(members.map(async (m) => {
      const lastPayment = await Payment.findOne({
        member: m._id,
        status: 'paid'
      }).sort({ paymentDate: -1 });

      const memberObj = m.toObject();
      memberObj.lastPaymentDate = lastPayment ? (lastPayment.paymentDate || lastPayment.createdAt) : null;
      return memberObj;
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get member stats for dashboard
// @route   GET /api/members/stats
exports.getMemberStats = async (req, res) => {
  try {
    await autoInactivateMembers(req.gymOwnerId);

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalMembers, 
      activeMembers, 
      expiredMembers,
      inactiveMembers,
      exitedMembers,
      newThisMonth,
      newLastMonth,
      expiringSoon,
      renewedToday,
      popularPlanData,
      revenuePlanData,
      expectedRevenueData,
      pendingRevenueData,
      dueThisWeek
    ] = await Promise.all([
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: { $ne: 'exited' } }),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'active', planExpiry: { $gte: now } }),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'active', planExpiry: { $lt: now } }),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'inactive' }),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'exited' }),
      Member.countDocuments({ 
        gymOwner: req.gymOwnerId, 
        joinDate: { $gte: currentMonthStart } 
      }),
      Member.countDocuments({ 
        gymOwner: req.gymOwnerId, 
        joinDate: { $gte: lastMonthStart, $lte: lastMonthEnd } 
      }),
      Member.countDocuments({
        gymOwner: req.gymOwnerId,
        status: { $ne: 'exited' },
        planExpiry: { $gte: now, $lte: threeDaysLater }
      }),
      Payment.countDocuments({
        gymOwner: req.gymOwnerId,
        paymentDate: { $gte: todayStart }
      }),
      Member.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: { $ne: 'exited' }, plan: { $exists: true, $ne: '' } } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'paid', plan: { $exists: true, $ne: '' } } },
        { $group: { _id: '$plan', revenue: { $sum: '$amount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 1 }
      ]),
      Member.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'active', planExpiry: { $gte: todayStart, $lte: sevenDaysLater } } },
        { $group: { _id: null, total: { $sum: '$planAmount' } } }
      ]),
      Member.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'active', planExpiry: { $lt: todayStart } } },
        { $group: { _id: null, total: { $sum: '$planAmount' } } }
      ]),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'active', planExpiry: { $gte: todayStart, $lte: sevenDaysLater } })
    ]);

    let growth = 0;
    if (newLastMonth > 0) {
      growth = ((newThisMonth - newLastMonth) / newLastMonth) * 100;
    } else if (newThisMonth > 0) {
      growth = 100;
    }

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        expiredMembers,
        exitedMembers,
        inactiveMembers,
        newThisMonth,
        expiringSoon,
        renewedToday,
        popularPlan: popularPlanData[0] ? popularPlanData[0]._id : 'N/A',
        popularPlanPercentage: popularPlanData[0] && totalMembers > 0 ? Math.round((popularPlanData[0].count / totalMembers) * 100) : 0,
        highestRevenuePlan: revenuePlanData[0] ? revenuePlanData[0]._id : 'N/A',
        expectedRevenue: expectedRevenueData[0] ? expectedRevenueData[0].total : 0,
        pendingRevenue: pendingRevenueData[0] ? pendingRevenueData[0].total : 0,
        dueThisWeek,
        growth: Math.round(growth)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search member by phone
// @route   GET /api/members/search/:phone
exports.searchByPhone = async (req, res) => {
  try {
    const member = await Member.findOne({ phone: req.params.phone, gymOwner: req.gymOwnerId }).populate('assignedTrainer', 'name phone');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle member status (active/expired)
// @route   PATCH /api/members/:id/toggle-status
exports.toggleMemberStatus = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    // Toggle between active/expired (roster) and inactive (deactivated)
    if (member.status === 'active' || member.status === 'expired') {
      member.status = 'inactive';
    } else {
      member.status = 'active';
      member.lastAttendance = new Date();
    }

    await member.save();
    
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expected renewals for the next 7 days
// @route   GET /api/members/expected-renewals
exports.getExpectedRenewals = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const next7DaysEnd = new Date();
    next7DaysEnd.setDate(next7DaysEnd.getDate() + 7);
    next7DaysEnd.setHours(23, 59, 59, 999);

    const result = await Member.aggregate([
      {
        $match: {
          gymOwner: req.gymOwnerId,
          status: 'active',
          planExpiry: { $gte: todayStart, $lte: next7DaysEnd }
        }
      },
      {
        $group: {
          _id: null,
          expectedRenewals: { $sum: '$planAmount' },
          membersDueForRenewal: { $sum: 1 }
        }
      }
    ]);

    const expectedRenewals = result.length > 0 ? result[0].expectedRenewals : 0;
    const membersDueForRenewal = result.length > 0 ? result[0].membersDueForRenewal : 0;

    res.status(200).json({
      success: true,
      expectedRenewals,
      membersDueForRenewal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.calculateExpiry = calculateExpiry;
module.exports.autoInactivateMembers = autoInactivateMembers;
