const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Lead = require('../models/Lead');
const Alert = require('../models/Alert');
const Trainer = require('../models/Trainer');
const Expense = require('../models/Expense');
const { autoInactivateMembers } = require('./memberController');

exports.getDashboard = async (req, res) => {
  try {
    if (req.gymOwnerId) {
      await autoInactivateMembers(req.gymOwnerId);
    }
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const threeDaysLater = new Date(); threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // Parallel queries for speed
    const [
      totalMembers, activeMembers, todayAttendance,
      inactiveCount, expiringCount, newLeads,
      unreadAlerts, todayRevenue, monthlyRevenue, monthlyExpenses,
      pendingPaymentsRes, renewalsDueRes
    ] = await Promise.all([
      Member.countDocuments({ gymOwner: req.gymOwnerId }),
      Member.countDocuments({ gymOwner: req.gymOwnerId, status: 'active' }),
      Attendance.countDocuments({ gymOwner: req.gymOwnerId, date: today }),
      Member.countDocuments({
        gymOwner: req.gymOwnerId,
        status: 'active',
        joinDate: { $lte: fiveDaysAgo },
        $or: [{ lastAttendance: { $lt: fiveDaysAgo } }, { lastAttendance: null }]
      }),
      Member.countDocuments({
        gymOwner: req.gymOwnerId,
        status: 'active',
        planExpiry: { $gte: now, $lte: threeDaysLater }
      }),
      Lead.countDocuments({
        gymOwner: req.gymOwnerId,
        status: 'new',
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }),
      Alert.countDocuments({ gymOwner: req.gymOwnerId, isRead: false, isDismissed: false }),
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, paymentDate: { $gte: new Date(today), $lte: new Date(today + 'T23:59:59') }, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, paymentDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { gymOwner: req.gymOwnerId, date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Member.aggregate([
        { 
          $match: { 
            gymOwner: req.gymOwnerId, 
            status: 'active', 
            planExpiry: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$planAmount' } } }
      ])
    ]);

    // Recent activity
    const recentMembers = await Member.find({ gymOwner: req.gymOwnerId }).sort({ createdAt: -1 }).limit(5).select('name phone plan createdAt');
    const recentPayments = await Payment.find({ gymOwner: req.gymOwnerId }).populate('member', 'name').sort({ paymentDate: -1 }).limit(5);

    // Attendance trend (last 7 days)
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Attendance.countDocuments({ gymOwner: req.gymOwnerId, date: dateStr });
      attendanceTrend.push({ date: dateStr, day: d.toLocaleDateString('en', { weekday: 'short' }), count });
    }

    // Revenue & Expense trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // prevent month wrapping overflow
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const [rev, exp] = await Promise.all([
        Payment.aggregate([
          { 
            $match: { 
              gymOwner: req.gymOwnerId, 
              paymentDate: { $gte: startOfMonth, $lte: endOfMonth }, 
              status: 'paid' 
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          { 
            $match: { 
              gymOwner: req.gymOwnerId, 
              date: { $gte: startOfMonth, $lte: endOfMonth } 
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);
      
      revenueTrend.push({
        month: d.toLocaleDateString('en', { month: 'short' }),
        year: d.getFullYear(),
        revenue: rev[0]?.total || 0,
        expense: exp[0]?.total || 0
      });
    }

    // Compare current month values with previous month values dynamically
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Revenue & Profit
    const [prevMonthRev, prevMonthExp] = await Promise.all([
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, paymentDate: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth }, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { gymOwner: req.gymOwnerId, date: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    const previousMonthRevenue = prevMonthRev[0]?.total || 0;
    const currentMonthRevenue = monthlyRevenue[0]?.total || 0;
    let revenueTrendPercent = 0;
    if (previousMonthRevenue > 0) {
      revenueTrendPercent = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      revenueTrendPercent = 100;
    }

    const previousMonthExpenses = prevMonthExp[0]?.total || 0;
    const currentMonthExpenses = monthlyExpenses[0]?.total || 0;
    const previousMonthProfit = previousMonthRevenue - previousMonthExpenses;
    const currentMonthProfit = currentMonthRevenue - currentMonthExpenses;
    let profitTrendPercent = 0;
    if (previousMonthProfit !== 0) {
      profitTrendPercent = ((currentMonthProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100;
    } else if (currentMonthProfit !== 0) {
      profitTrendPercent = 100;
    }

    // 2. Members (Joined this month vs joined last month)
    const joinedThisMonth = await Member.countDocuments({
      gymOwner: req.gymOwnerId,
      joinDate: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
    });
    const joinedLastMonth = await Member.countDocuments({
      gymOwner: req.gymOwnerId,
      joinDate: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth }
    });
    let membersTrendPercent = 0;
    if (joinedLastMonth > 0) {
      membersTrendPercent = ((joinedThisMonth - joinedLastMonth) / joinedLastMonth) * 100;
    } else if (joinedThisMonth > 0) {
      membersTrendPercent = 100;
    }
    // 2.5 Revenue at Risk (Pending Payments + Renewals Due Within 7 Days)
    const pendingPaymentsAmt = pendingPaymentsRes[0]?.total || 0;
    const renewalsDueAmt = renewalsDueRes[0]?.total || 0;
    const currentRevenueAtRisk = pendingPaymentsAmt + renewalsDueAmt;

    const startOfPreviousMonthPlus7 = new Date(startOfPreviousMonth);
    startOfPreviousMonthPlus7.setDate(startOfPreviousMonthPlus7.getDate() + 7);

    const [prevPendingRes, prevRenewalsRes] = await Promise.all([
      Payment.aggregate([
        { 
          $match: { 
            gymOwner: req.gymOwnerId, 
            status: { $in: ['pending', 'overdue'] }, 
            createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Member.aggregate([
        { 
          $match: { 
            gymOwner: req.gymOwnerId, 
            status: 'active', 
            planExpiry: { $gte: startOfPreviousMonth, $lte: startOfPreviousMonthPlus7 } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$planAmount' } } }
      ])
    ]);

    const prevPendingAmt = prevPendingRes[0]?.total || 0;
    const prevRenewalsAmt = prevRenewalsRes[0]?.total || 0;
    const prevRevenueAtRisk = prevPendingAmt + prevRenewalsAmt;

    let riskTrendPercent = 0;
    if (prevRevenueAtRisk > 0) {
      riskTrendPercent = ((currentRevenueAtRisk - prevRevenueAtRisk) / prevRevenueAtRisk) * 100;
    } else if (currentRevenueAtRisk > 0) {
      riskTrendPercent = 100;
    }


    // 3. Attendance (Today vs Yesterday)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const yesterdayAttendance = await Attendance.countDocuments({
      gymOwner: req.gymOwnerId,
      date: yesterday
    });

    let attendanceTrendPercent = 0;
    if (yesterdayAttendance > 0) {
      attendanceTrendPercent = ((todayAttendance - yesterdayAttendance) / yesterdayAttendance) * 100;
    } else if (todayAttendance > 0) {
      attendanceTrendPercent = 100;
    }

    // 4. Trainers (Total trainers this month vs last month)
    const [currentTrainers, prevTrainers] = await Promise.all([
      Trainer.countDocuments({ gymOwner: req.gymOwnerId }),
      Trainer.countDocuments({ gymOwner: req.gymOwnerId, createdAt: { $lte: endOfPreviousMonth } })
    ]);
    let trainersTrendPercent = 0;
    if (prevTrainers > 0) {
      trainersTrendPercent = ((currentTrainers - prevTrainers) / prevTrainers) * 100;
    } else if (currentTrainers > 0 && prevTrainers > 0) {
      trainersTrendPercent = 100;
    }

    // Safety check for newly created gym or gym with no data
    const hasGymData = totalMembers > 0 || currentMonthRevenue > 0 || previousMonthRevenue > 0 || currentMonthExpenses > 0 || previousMonthExpenses > 0;
    if (!hasGymData) {
      profitTrendPercent = 0;
      revenueTrendPercent = 0;
      riskTrendPercent = 0;
      membersTrendPercent = 0;
      attendanceTrendPercent = 0;
      trainersTrendPercent = 0;
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMembers, activeMembers, todayAttendance,
          inactiveMembers: inactiveCount, expiringPlans: expiringCount,
          newLeads, unreadAlerts,
          todayRevenue: todayRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
          monthlyProfit: currentMonthProfit,
          profitTrendPercent,
          revenueAtRisk: currentRevenueAtRisk,
          riskTrendPercent,
          revenueTrend,
          revenueTrendPercent,
          membersTrendPercent,
          attendanceTrendPercent,
          trainersTrendPercent,
          joinedThisMonth
        },
        recentMembers, recentPayments, attendanceTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
