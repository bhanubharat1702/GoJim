const Lead = require('../models/Lead');
const Member = require('../models/Member');
const mongoose = require('mongoose');

exports.getLeads = async (req, res) => {
  try {
    const { status, search, sort, page = 1, limit = 20, startDate, endDate, filter } = req.query;
    const query = { gymOwner: req.gymOwnerId };
    
    if (filter === 'stale') {
      const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      query.createdAt = { $lt: startOfCurrentMonth };
      query.status = { $nin: ['joined', 'lost'] };
    } else if (filter === 'pending_followups') {
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      query.followUpDate = { $lte: todayEnd, $ne: null };
      query.status = { $nin: ['joined', 'lost'] };
      // if todayOnly is needed, the client can pass a specific startDate
    } else if (status) {
      if (status === 'follow_up') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        startOfToday.setHours(startOfToday.getHours() - 12);
        query.status = { $nin: ['joined', 'lost'] };
        query.followUpDate = { $gte: startOfToday };
      } else {
        query.status = status;
      }
    }

    if (startDate || endDate) {
      query.createdAt = query.createdAt || {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        query.$or.push({ _id: search });
      }
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name')
      .populate('assignedTrainer', 'name phone')
      .sort(sort || { createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));

    res.status(200).json({ 
      success: true, 
      count: leads.length, 
      total, 
      pages: Math.ceil(total / limit),
      page: parseInt(page),
      hasMore: (page * limit) < total,
      data: leads 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId })
      .populate('assignedTo', 'name')
      .populate('assignedTrainer', 'name phone');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    if (req.body.phone) {
      const existingLead = await Lead.findOne({ phone: req.body.phone, gymOwner: req.gymOwnerId });
      if (existingLead) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another lead' });
      }
      const existingMember = await Member.findOne({ phone: req.body.phone, gymOwner: req.gymOwnerId });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to a member in the system' });
      }
    }
    const lead = await Lead.create({ 
      ...req.body, 
      gymOwner: req.gymOwnerId, 
      createdBy: req.user.id,
      statusHistory: [{ status: req.body.status || 'new', date: new Date() }]
    });

    // Trigger automatic WhatsApp lead welcome message
    if (lead.phone) {
      try {
        const { sendMessage } = require('../utils/whatsappService');
        sendMessage(req.user.id, lead.phone, 'new_lead', {
          name: lead.name
        }).catch(err => console.error('Auto lead WhatsApp error:', err.message));
      } catch (err) {
        console.error('Error in lead message trigger:', err);
      }
    }

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const existing = await Lead.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.body.status === 'contacted') req.body.lastContactDate = new Date();
    if (req.body.status === 'trial') req.body.trialTaken = true;

    if (req.body.phone) {
      const existingLead = await Lead.findOne({
        phone: req.body.phone,
        gymOwner: req.gymOwnerId,
        _id: { $ne: req.params.id }
      });
      if (existingLead) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another lead' });
      }
      const existingMember = await Member.findOne({ phone: req.body.phone, gymOwner: req.gymOwnerId });
      if (existingMember) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to a member in the system' });
      }
    }

    const updateData = { ...req.body };
    if (req.body.status && req.body.status !== existing.status) {
      if (!updateData.$push) updateData.$push = {};
      updateData.$push.statusHistory = { status: req.body.status, date: new Date() };
    }

    const lead = await Lead.findOneAndUpdate({ _id: req.params.id, gymOwner: req.gymOwnerId }, updateData, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    
    // Automatically delete alert details for the lead
    const Alert = require('../models/Alert');
    await Alert.deleteMany({
      relatedLead: req.params.id,
      gymOwner: req.gymOwnerId
    });

    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFollowUps = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const leads = await Lead.find({
      gymOwner: req.gymOwnerId,
      followUpDate: { $lte: today },
      status: { $nin: ['joined', 'lost'] }
    }).sort({ followUpDate: 1 });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLeadStats = async (req, res) => {
  try {
    const { status, search, startDate, endDate, filter } = req.query;
    const baseQuery = { gymOwner: req.gymOwnerId };
    
    if (filter === 'stale') {
      const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      baseQuery.createdAt = { $lt: startOfCurrentMonth };
      baseQuery.status = { $nin: ['joined', 'lost'] };
    } else if (filter === 'pending_followups') {
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      baseQuery.followUpDate = { $lte: todayEnd, $ne: null };
      baseQuery.status = { $nin: ['joined', 'lost'] };
    } else if (status) {
      if (status === 'follow_up') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        startOfToday.setHours(startOfToday.getHours() - 12);
        baseQuery.status = { $nin: ['joined', 'lost'] };
        baseQuery.followUpDate = { $gte: startOfToday };
      } else {
        baseQuery.status = status;
      }
    }

    if (startDate || endDate) {
      baseQuery.createdAt = baseQuery.createdAt || {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        baseQuery.$or.push({ _id: search });
      }
    }

    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      statusStats,
      total,
      addedThisWeek,
      thisMonth,
      lastMonth,
      followUpCount,
      followUpsDueToday,
      sourceStats,
      lostThisWeek,
      revenueData,
      planData
    ] = await Promise.all([
      Lead.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.countDocuments(baseQuery),
      Lead.countDocuments({ ...baseQuery, createdAt: { $gte: sevenDaysAgo } }),
      Lead.countDocuments({ ...baseQuery, createdAt: { $gte: currentMonthStart } }),
      Lead.countDocuments({ ...baseQuery, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      Lead.countDocuments({
        ...baseQuery,
        status: { $nin: ['joined', 'lost'] },
        followUpDate: { $gte: new Date(startOfToday.getTime() - 12 * 60 * 60 * 1000) }
      }),
      Lead.countDocuments({
        ...baseQuery,
        status: { $nin: ['joined', 'lost'] },
        followUpDate: { $gte: startOfToday, $lte: endOfToday }
      }),
      Lead.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      Lead.countDocuments({ ...baseQuery, status: 'lost', updatedAt: { $gte: sevenDaysAgo } }),
      // Revenue potential sum
      Lead.aggregate([
        { $match: { ...baseQuery, status: { $in: ['interested', 'trial', 'contacted'] } } },
        { $group: { _id: null, totalRevenue: { $sum: { $toDouble: "$planAmount" } } } }
      ]),
      // Most interested plan
      Lead.aggregate([
        { $match: { ...baseQuery, interestedPlan: { $ne: 'undecided' } } },
        { $group: { _id: '$interestedPlan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ])
    ]);

    let growth = 0;
    if (lastMonth > 0) {
      growth = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    } else if (thisMonth > 0) {
      growth = 100;
    }

    const joinedCount = statusStats.find(s => s._id === 'joined')?.count || 0;
    const conversionRate = total > 0 ? Math.round((joinedCount / total) * 100) : 0;
    const topSource = sourceStats[0] ? sourceStats[0]._id : 'N/A';
    const topSourceCount = sourceStats[0] ? sourceStats[0].count : 0;
    
    const potentialRevenue = revenueData[0]?.totalRevenue || 0;
    let potentialRevenueFormatted = '₹0';
    if (potentialRevenue >= 1000) {
      potentialRevenueFormatted = `₹${(potentialRevenue / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    } else {
      potentialRevenueFormatted = `₹${potentialRevenue}`;
    }

    const hotLeads = statusStats.find(s => s._id === 'interested')?.count || 0 + (statusStats.find(s => s._id === 'trial')?.count || 0);
    const mostInterestedPlan = planData[0] ? planData[0]._id : 'N/A';
    const formattedMostInterestedPlan = mostInterestedPlan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    res.status(200).json({
      success: true,
      data: {
        stats: statusStats,
        total,
        addedThisWeek,
        thisMonth,
        lastMonth,
        growth,
        followUpCount,
        followUpsDueToday,
        conversionRate,
        joinedCount,
        lostCount: statusStats.find(s => s._id === 'lost')?.count || 0,
        lostThisWeek,
        topSource,
        topSourceCount,
        potentialRevenueFormatted,
        hotLeads,
        formattedMostInterestedPlan
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
