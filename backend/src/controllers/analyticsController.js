const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Plan = require('../models/Plan');

// Helper to calculate date range based on filter
const getDateRange = (filter, startDate, endDate) => {
  const now = new Date();
  let start, end;

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'week':
      // Current Week: Monday to Sunday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { start, end };
};

// Helper for previous period of same duration
const getPreviousPeriodRange = (start, end) => {
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration - 1);
  const prevEnd = new Date(start.getTime() - 1);
  return { start: prevStart, end: prevEnd };
};

// Helper to format hour ranges
const formatHourRange = (h) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const nextH = (h + 1) % 12 === 0 ? 12 : (h + 1) % 12;
  const nextAmpm = (h + 1) >= 12 && (h + 1) < 24 ? 'PM' : 'AM';
  return `${displayH} ${ampm} - ${nextH} ${nextAmpm}`;
};

// Get Dashboard1 analytics
exports.getDashboard1Analytics = async (req, res) => {
  try {
    const gymOwnerId = req.gymOwnerId;
    const { filter, startDate, endDate } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);
    const prevRange = getPreviousPeriodRange(start, end);

    // 1. Gym capacity
    const ownerUser = await User.findById(gymOwnerId);
    const capacity = ownerUser ? ownerUser.capacity : 100;

    // 2. Load attendance for peak/quiet hour prediction
    // If range is too small, use last 30 days to have enough stats
    let predictionStart = start;
    let predictionEnd = end;
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 14) {
      predictionStart = new Date();
      predictionStart.setDate(predictionStart.getDate() - 30);
      predictionStart.setHours(0, 0, 0, 0);
      predictionEnd = new Date();
      predictionEnd.setHours(23, 59, 59, 999);
    }

    const predictionAttendances = await Attendance.find({
      gymOwner: gymOwnerId,
      checkInTime: { $gte: predictionStart, $lte: predictionEnd }
    });

    // Peak and Quiet hour analysis
    const distinctDays = new Set();
    const dayHourCounts = {};
    predictionAttendances.forEach(att => {
      if (att.checkInTime) {
        const dObj = new Date(att.checkInTime);
        const hour = dObj.getHours();
        const dateStr = att.date || dObj.toISOString().split('T')[0];
        distinctDays.add(dateStr);
        const key = `${dateStr}:${hour}`;
        dayHourCounts[key] = (dayHourCounts[key] || 0) + 1;
      }
    });

    const numDays = distinctDays.size || 1;
    const activeHours = [];
    for (let h = 5; h <= 22; h++) {
      let totalForHour = 0;
      distinctDays.forEach(dStr => {
        totalForHour += (dayHourCounts[`${dStr}:${h}`] || 0);
      });
      const avg = totalForHour / numDays;
      activeHours.push({ hour: h, avg });
    }

    let peak = { hour: 18, avg: 0 };
    let quiet = { hour: 12, avg: 0 };
    if (activeHours.length > 0) {
      // Peak Hour
      activeHours.forEach(item => {
        if (item.avg > peak.avg) {
          peak = item;
        }
      });
      // Quiet Hour (find minimum average attendance, default to positive if possible)
      let minAvg = Infinity;
      activeHours.forEach(item => {
        if (item.avg < minAvg) {
          minAvg = item.avg;
          quiet = item;
        }
      });
    }

    // 3. Revenue Forecast
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      renewals7d,
      renewals30d,
      pendingPayments
    ] = await Promise.all([
      Member.find({
        gymOwner: gymOwnerId,
        status: 'active',
        planExpiry: { $gte: now, $lte: next7Days }
      }).select('planAmount'),
      Member.find({
        gymOwner: gymOwnerId,
        status: 'active',
        planExpiry: { $gte: now, $lte: next30Days }
      }).select('planAmount'),
      Payment.find({
        gymOwner: gymOwnerId,
        status: 'pending'
      }).select('amount')
    ]);

    const upcomingRenewal7d = renewals7d.reduce((sum, m) => sum + (m.planAmount || 0), 0);
    const upcomingRenewal30d = renewals30d.reduce((sum, m) => sum + (m.planAmount || 0), 0);
    const pendingPaymentAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const expectedRevenueThisWeek = upcomingRenewal7d + pendingPaymentAmount;
    const expectedRevenueThisMonth = upcomingRenewal30d + pendingPaymentAmount;

    // 4. At-Risk Members
    const activeMembers = await Member.find({ gymOwner: gymOwnerId, status: 'active' });
    const referenceDate = end;
    let atRiskCount = 0;
    activeMembers.forEach(m => {
      const lastVisit = m.lastAttendance ? new Date(m.lastAttendance) : new Date(m.joinDate);
      const diffTime = referenceDate.getTime() - lastVisit.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 14) {
        atRiskCount++;
      }
    });

    // 5. Weekly Summary Growth Calculations
    const [
      currentAttendanceCount,
      prevAttendanceCount,
      currentPayments,
      prevPayments,
      allAttendanceInRange
    ] = await Promise.all([
      Attendance.countDocuments({ gymOwner: gymOwnerId, checkInTime: { $gte: start, $lte: end } }),
      Attendance.countDocuments({ gymOwner: gymOwnerId, checkInTime: { $gte: prevRange.start, $lte: prevRange.end } }),
      Payment.find({ gymOwner: gymOwnerId, paymentDate: { $gte: start, $lte: end }, status: 'paid' }).select('amount'),
      Payment.find({ gymOwner: gymOwnerId, paymentDate: { $gte: prevRange.start, $lte: prevRange.end }, status: 'paid' }).select('amount'),
      Attendance.find({ gymOwner: gymOwnerId, checkInTime: { $gte: start, $lte: end } })
    ]);

    // Attendance Growth
    let attendanceGrowth = 0;
    if (prevAttendanceCount > 0) {
      attendanceGrowth = ((currentAttendanceCount - prevAttendanceCount) / prevAttendanceCount) * 100;
    } else if (currentAttendanceCount > 0) {
      attendanceGrowth = 100;
    }

    // Revenue Growth
    const currentRevenue = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const prevRevenue = prevPayments.reduce((sum, p) => sum + p.amount, 0);
    let revenueGrowth = 0;
    if (prevRevenue > 0) {
      revenueGrowth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (currentRevenue > 0) {
      revenueGrowth = 100;
    }

    // Peak and Quiet Day of Week in range
    const dayOfWeekCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    const dayOfWeekOccurrences = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };

    // Count distinct dates in range to compute occurrences of each day of week
    const dateCursor = new Date(start);
    while (dateCursor <= end) {
      const dow = dateCursor.getDay();
      dayOfWeekOccurrences[dow] = (dayOfWeekOccurrences[dow] || 0) + 1;
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    allAttendanceInRange.forEach(att => {
      if (att.checkInTime) {
        const dow = new Date(att.checkInTime).getDay();
        dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let peakDayName = 'Monday';
    let peakDayAvg = -1;
    let quietDayName = 'Sunday';
    let quietDayAvg = Infinity;

    Object.keys(dayOfWeekCounts).forEach(dowStr => {
      const dow = parseInt(dowStr);
      const occurrences = dayOfWeekOccurrences[dow] || 1;
      const avg = dayOfWeekCounts[dow] / occurrences;
      
      if (avg > peakDayAvg) {
        peakDayAvg = avg;
        peakDayName = dayNames[dow];
      }
      if (avg < quietDayAvg) {
        quietDayAvg = avg;
        quietDayName = dayNames[dow];
      }
    });

    // Most popular plan sold in selected range
    const soldPlans = await Member.aggregate([
      { $match: { gymOwner: gymOwnerId, joinDate: { $gte: start, $lte: end } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostPopularPlan = soldPlans.length > 0 ? soldPlans[0]._id : 'monthly';

    // 6. Dynamic Business Recommendations
    const recommendations = [];

    // Capacity recommendation
    if (peak.avg > 0.85 * capacity) {
      recommendations.push({
        type: 'capacity',
        title: 'High Capacity Alert',
        description: `Evening slot (${formatHourRange(peak.hour)}) average utilization exceeds 85% of your gym capacity (${capacity} visitors). Consider scheduling training slots or advising members to visit during quieter hours.`,
        severity: 'danger'
      });
    } else if (peak.avg > 0.60 * capacity) {
      recommendations.push({
        type: 'capacity',
        title: 'Moderate Capacity Utilization',
        description: `Peak hours are approaching 60% capacity. Monitor active attendance to maintain a comfortable space.`,
        severity: 'warning'
      });
    } else {
      recommendations.push({
        type: 'capacity',
        title: 'Capacity Optimal',
        description: 'Gym capacity utilization remains within comfortable levels. Space is well-utilized.',
        severity: 'success'
      });
    }

    // Electricity saving recommendation
    const lowHours = activeHours.filter(item => item.hour >= 11 && item.hour <= 15 && item.avg < 0.10 * capacity);
    if (lowHours.length > 0) {
      recommendations.push({
        type: 'electricity',
        title: 'Electricity Savings Opportunity',
        description: 'Low utilization (less than 10% capacity) observed between 11 AM and 3 PM. Suggest shutting down secondary air conditioners and non-essential lighting during this time to optimize energy costs.',
        severity: 'warning'
      });
    } else {
      recommendations.push({
        type: 'electricity',
        title: 'Power Usage Aligned',
        description: 'No long extended quiet periods found during daytime. Gym energy usage matches operational demand.',
        severity: 'success'
      });
    }

    // Member retention recommendation
    if (atRiskCount > 0) {
      recommendations.push({
        type: 'retention',
        title: 'At-Risk Members Nudge',
        description: `${atRiskCount} active members have not checked in for over 14 days. Suggest launching an automated WhatsApp comeback nudge campaign or calling them directly.`,
        severity: 'danger'
      });
    } else {
      recommendations.push({
        type: 'retention',
        title: 'Strong Retention Rates',
        description: 'Excellent check-in regularity! Active members are visiting frequently, keep up the engagement.',
        severity: 'success'
      });
    }

    // Renewal recommendation
    const expiringMembersCount = renewals7d.length;
    if (expiringMembersCount > 0) {
      recommendations.push({
        type: 'renewal',
        title: 'Proactive Renewal Follow-up',
        description: `${expiringMembersCount} memberships are expiring within the next 7 days, representing ₹${upcomingRenewal7d.toLocaleString()} in forecast renewals. Send payment reminders now.`,
        severity: 'warning'
      });
    } else {
      recommendations.push({
        type: 'renewal',
        title: 'No Pending Renewals Due',
        description: 'No memberships are expiring in the next 7 days. Focus on sales and onboarding new clients.',
        severity: 'success'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        predictions: {
          peakTime: {
            range: formatHourRange(peak.hour),
            expectedVisitors: Math.round(peak.avg)
          },
          quietTime: {
            range: formatHourRange(quiet.hour),
            expectedVisitors: Math.round(quiet.avg)
          },
          revenueForecast: {
            thisWeek: expectedRevenueThisWeek,
            thisMonth: expectedRevenueThisMonth
          },
          atRisk: {
            count: atRiskCount
          }
        },
        weeklySummary: {
          attendanceGrowth,
          revenueGrowth,
          peakDay: peakDayName,
          quietDay: quietDayName,
          mostPopularPlan
        },
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Visual Analytics
exports.getVisualsAnalytics = async (req, res) => {
  try {
    const gymOwnerId = req.gymOwnerId;
    const { filter, startDate, endDate } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    // 1. Heatmap and slot distribution
    const attendances = await Attendance.find({
      gymOwner: gymOwnerId,
      checkInTime: { $gte: start, $lte: end }
    });

    const heatmapGrid = {};
    const slots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const dayOfWeekCounts = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 0: {} };

    attendances.forEach(att => {
      if (att.checkInTime) {
        const dObj = new Date(att.checkInTime);
        const dayOfWeek = dObj.getDay(); // 0 = Sunday, 1 = Monday...
        const hour = dObj.getHours();

        // Heatmap mapping: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=7
        const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        const cellKey = `${mappedDay}:${hour}`;
        heatmapGrid[cellKey] = (heatmapGrid[cellKey] || 0) + 1;

        // Peak Day calculation helper
        dayOfWeekCounts[dayOfWeek][hour] = (dayOfWeekCounts[dayOfWeek][hour] || 0) + 1;

        // Slot Distribution
        if (hour >= 5 && hour < 11) slots.morning++;
        else if (hour >= 11 && hour < 16) slots.afternoon++;
        else if (hour >= 16 && hour < 21) slots.evening++;
        else slots.night++;
      }
    });

    // 2. Attendance Heatmap Array Response Formatter
    const heatmap = [];
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let d = 1; d <= 7; d++) {
      const hoursData = [];
      for (let h = 5; h <= 22; h++) {
        hoursData.push({
          hour: h,
          formattedHour: formatHourRange(h).split(' - ')[0],
          count: heatmapGrid[`${d}:${h}`] || 0
        });
      }
      heatmap.push({
        day: weekdays[d - 1],
        dayIndex: d,
        hours: hoursData
      });
    }

    // 3. Time Slot Distribution percentages
    const totalCheckins = attendances.length || 1;
    const slotPercentages = {
      morning: parseFloat(((slots.morning / totalCheckins) * 100).toFixed(1)),
      afternoon: parseFloat(((slots.afternoon / totalCheckins) * 100).toFixed(1)),
      evening: parseFloat(((slots.evening / totalCheckins) * 100).toFixed(1)),
      night: parseFloat(((slots.night / totalCheckins) * 100).toFixed(1))
    };

    // 4. Attendance Trend (Last 30 Days or selected filter range)
    const trendMap = {};
    const dayDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Seed dates to ensure chart is continuous
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0];
      trendMap[dateStr] = 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    attendances.forEach(att => {
      const dateStr = att.date || new Date(att.checkInTime).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    });

    const attendanceTrend = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Peak Days Analysis
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distinctDates = new Set();
    attendances.forEach(att => {
      distinctDates.add(att.date || new Date(att.checkInTime).toISOString().split('T')[0]);
    });

    const dayOfWeekOccurrences = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    distinctDates.forEach(dateStr => {
      const dow = new Date(dateStr).getDay();
      dayOfWeekOccurrences[dow]++;
    });

    const peakDaysAnalysis = dayNames.map((name, index) => {
      const occurrences = dayOfWeekOccurrences[index] || 1;
      const dayTotal = Object.values(dayOfWeekCounts[index]).reduce((sum, val) => sum + val, 0);
      const avg = parseFloat((dayTotal / occurrences).toFixed(1));
      return { day: name, avg };
    });

    // Determine highest and lowest
    let highestDay = peakDaysAnalysis[1]; // Mon
    let lowestDay = peakDaysAnalysis[0]; // Sun
    peakDaysAnalysis.forEach(d => {
      if (d.avg > highestDay.avg) highestDay = d;
      if (d.avg < lowestDay.avg) lowestDay = d;
    });

    // 6. Capacity Utilization
    const ownerUser = await User.findById(gymOwnerId);
    const capacity = ownerUser ? ownerUser.capacity : 100;

    // Peak attendance in single hour
    let peakHourlyCount = 0;
    const hourlyCounts = {};
    attendances.forEach(att => {
      if (att.checkInTime) {
        const datePart = att.date || new Date(att.checkInTime).toISOString().split('T')[0];
        const hour = new Date(att.checkInTime).getHours();
        const key = `${datePart}:${hour}`;
        hourlyCounts[key] = (hourlyCounts[key] || 0) + 1;
        if (hourlyCounts[key] > peakHourlyCount) {
          peakHourlyCount = hourlyCounts[key];
        }
      }
    });

    const peakUtilization = parseFloat(((peakHourlyCount / capacity) * 100).toFixed(1));

    // Current Utilization (active check-ins right now, or checked-in within the last 2 hours and not checked out)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const currentActiveCheckins = await Attendance.countDocuments({
      gymOwner: gymOwnerId,
      checkInTime: { $gte: twoHoursAgo },
      checkOutTime: null
    });
    const currentUtilization = parseFloat(((currentActiveCheckins / capacity) * 100).toFixed(1));

    // Average Utilization across active hours
    const totalOperationalSlots = Object.keys(hourlyCounts).length || 1;
    const totalOperationalVisits = Object.values(hourlyCounts).reduce((s, v) => s + v, 0);
    const avgVisitsPerHour = totalOperationalVisits / totalOperationalSlots;
    const avgUtilization = parseFloat(((avgVisitsPerHour / capacity) * 100).toFixed(1));

    let utilizationStatus = 'Low';
    if (peakUtilization >= 85) utilizationStatus = 'Critical';
    else if (peakUtilization >= 60) utilizationStatus = 'High';
    else if (peakUtilization >= 30) utilizationStatus = 'Moderate';

    // 7. Revenue Forecast Analysis (Upcoming Renewals + Pending Collections for 7d & 30d)
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      renewals7d,
      renewals30d,
      pendingPayments
    ] = await Promise.all([
      Member.find({
        gymOwner: gymOwnerId,
        status: 'active',
        planExpiry: { $gte: now, $lte: next7Days }
      }).select('planAmount'),
      Member.find({
        gymOwner: gymOwnerId,
        status: 'active',
        planExpiry: { $gte: now, $lte: next30Days }
      }).select('planAmount'),
      Payment.find({
        gymOwner: gymOwnerId,
        status: 'pending'
      }).select('amount')
    ]);

    const upcoming7d = renewals7d.reduce((sum, m) => sum + (m.planAmount || 0), 0);
    const upcoming30d = renewals30d.reduce((sum, m) => sum + (m.planAmount || 0), 0);
    const pendingCollections = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const revenueForecast = {
      next7Days: {
        upcomingRenewals: upcoming7d,
        pendingCollections,
        expectedRevenue: upcoming7d + pendingCollections
      },
      next30Days: {
        upcomingRenewals: upcoming30d,
        pendingCollections,
        expectedRevenue: upcoming30d + pendingCollections
      }
    };

    // 8. At-Risk Members Analysis grouped by days inactive
    const activeMembers = await Member.find({ gymOwner: gymOwnerId, status: 'active' });
    const atRiskGroups = {
      days7: 0,
      days14: 0,
      days30: 0,
      days60: 0
    };

    activeMembers.forEach(m => {
      const lastVisit = m.lastAttendance ? new Date(m.lastAttendance) : new Date(m.joinDate);
      const diffTime = now.getTime() - lastVisit.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 60) atRiskGroups.days60++;
      else if (diffDays >= 30) atRiskGroups.days30++;
      else if (diffDays >= 14) atRiskGroups.days14++;
      else if (diffDays >= 7) atRiskGroups.days7++;
    });

    // 9. Plan Performance
    // Count active memberships sold per plan
    const planCounts = await Member.aggregate([
      { $match: { gymOwner: gymOwnerId, status: 'active' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const planPerformance = planCounts.map(item => ({
      name: item._id,
      sales: item.count
    }));

    let bestPlan = '-';
    if (planPerformance.length > 0) {
      bestPlan = planPerformance[0].name;
    }

    // 10. Trainer Demand Analysis
    // Fetch active trainers
    const trainersList = await Trainer.find({ gymOwner: gymOwnerId, status: 'active' });
    const trainerDemand = [];

    for (const trainer of trainersList) {
      const [ptClientsCount, ptSessionsCount] = await Promise.all([
        Member.countDocuments({ gymOwner: gymOwnerId, assignedTrainer: trainer._id, status: 'active' }),
        Attendance.countDocuments({
          gymOwner: gymOwnerId,
          checkInTime: { $gte: start, $lte: end }
        })
      ]);

      // Complete sessions count: since Mongoose Attendance doesn't directly link trainer to attendance record,
      // we calculate completed PT sessions as members check-ins assigned to this trainer during the period
      const memberIdsAssignedToTrainer = await Member.find({
        gymOwner: gymOwnerId,
        assignedTrainer: trainer._id
      }).select('_id');
      const ids = memberIdsAssignedToTrainer.map(m => m._id);

      const completedPtSessions = await Attendance.countDocuments({
        gymOwner: gymOwnerId,
        member: { $in: ids },
        checkInTime: { $gte: start, $lte: end }
      });

      trainerDemand.push({
        id: trainer._id,
        name: trainer.name,
        ptClients: ptClientsCount,
        completedSessions: completedPtSessions
      });
    }

    // Sort to find most demanded trainer
    let mostDemandedTrainer = '-';
    let maxPtClients = -1;
    trainerDemand.forEach(t => {
      if (t.ptClients > maxPtClients) {
        maxPtClients = t.ptClients;
        mostDemandedTrainer = t.name;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        heatmap,
        slotPercentages,
        attendanceTrend,
        peakDaysAnalysis: {
          data: peakDaysAnalysis,
          highestDay: highestDay.day,
          lowestDay: lowestDay.day
        },
        capacityUtilization: {
          currentUtilization,
          peakUtilization,
          avgUtilization,
          status: utilizationStatus,
          capacity
        },
        revenueForecast,
        atRiskGroups,
        planPerformance: {
          data: planPerformance,
          bestPlan
        },
        trainerDemand: {
          data: trainerDemand,
          mostDemandedTrainer
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
