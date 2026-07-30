const Alert = require('../models/Alert');
const Member = require('../models/Member');
const Lead = require('../models/Lead');
const Expense = require('../models/Expense');
const Trainer = require('../models/Trainer');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { autoInactivateMembers } = require('./memberController');

const isTrainerCompatible = (trainer, memberTimeSlotName, timeSlots) => {
  if (!memberTimeSlotName) return true; // If no slot chosen, all are compatible
  if (!trainer) return false;

  // Named slot match
  if (trainer.timeSlot && trainer.timeSlot !== 'custom') {
    return trainer.timeSlot === memberTimeSlotName;
  }

  // Custom working hours range inclusion check
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const memberSlot = (timeSlots || []).find(s => s.name === memberTimeSlotName && (s.status === 'Active' || s.status === 'active' || !s.status));
  if (!memberSlot) return true; // Default fallback if slot config is missing

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

exports.getAlerts = async (req, res) => {
  try {
    if (!req.gymOwnerId) {
      return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
    }

    autoInactivateMembers(req.gymOwnerId).catch(err => {
      console.error('Background auto-inactivation failed:', err);
    });

    // Self-healing: if no members and no leads exist in system for this gymOwner, clear all legacy alerts
    const memberCount = await Member.countDocuments({ gymOwner: req.gymOwnerId });
    const leadCount = await Lead.countDocuments({ gymOwner: req.gymOwnerId });
    if (memberCount === 0 && leadCount === 0) {
      await Alert.deleteMany({ gymOwner: req.gymOwnerId });
      return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
    }

    const { type, isRead, page = 1, limit = 20 } = req.query;
    const query = { gymOwner: req.gymOwnerId, isDismissed: false };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate('relatedMember', 'name phone')
      .populate('relatedLead', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));

    res.status(200).json({ success: true, count: alerts.length, total, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    if (!req.gymOwnerId) {
      return res.status(400).json({ success: false, message: 'Owner context required' });
    }
    const alert = await Alert.findOneAndUpdate({ _id: req.params.id, gymOwner: req.gymOwnerId }, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.dismissAlert = async (req, res) => {
  try {
    if (!req.gymOwnerId) {
      return res.status(400).json({ success: false, message: 'Owner context required' });
    }
    const alert = await Alert.findOneAndUpdate({ _id: req.params.id, gymOwner: req.gymOwnerId }, { isDismissed: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateAlerts = async (req, res) => {
  try {
    if (!req.gymOwnerId) {
      return res.status(200).json({ success: true, generated: 0, data: [] });
    }

    autoInactivateMembers(req.gymOwnerId).catch(err => {
      console.error('Background auto-inactivation failed:', err);
    });

    // Dynamic clean-up: if no members/leads exist in the system, clear alerts and exit
    const memberCount = await Member.countDocuments({ gymOwner: req.gymOwnerId });
    const leadCount = await Lead.countDocuments({ gymOwner: req.gymOwnerId });
    if (memberCount === 0 && leadCount === 0) {
      await Alert.deleteMany({ gymOwner: req.gymOwnerId });
      return res.status(200).json({ success: true, generated: 0, data: [] });
    }

    // Housekeeping: Clean up alerts older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await Alert.deleteMany({ gymOwner: req.gymOwnerId, createdAt: { $lt: thirtyDaysAgo } });

    // Self-healing: clean up alerts that have been resolved or are no longer valid at the current moment
    const activeAlerts = await Alert.find({ gymOwner: req.gymOwnerId, isDismissed: false })
      .populate('relatedMember')
      .populate('relatedLead');

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayDate = new Date();
    const todayDay = todayDate.getDate();
    const todayMonth = todayDate.getMonth();

    // Query previous month expenses, owner timeSlots, active staff/trainers, and active members for conflicts
    const ownerUser = await User.findById(req.gymOwnerId).select('timeSlots');
    const timeSlots = ownerUser ? ownerUser.timeSlots : [];

    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthIdx = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    const prevMonthExpenses = await Expense.find({
      gymOwner: req.gymOwnerId,
      date: {
        $gte: new Date(prevMonthYear, prevMonthIdx, 1),
        $lte: new Date(prevMonthYear, prevMonthIdx + 1, 0, 23, 59, 59, 999)
      }
    });

    const activeStaff = await Staff.find({ gymOwner: req.gymOwnerId, status: 'active' });
    const activeTrainers = await Trainer.find({ gymOwner: req.gymOwnerId, status: 'active' });
    const activeMembersForConflict = await Member.find({ gymOwner: req.gymOwnerId, status: 'active' }).populate('assignedTrainer');

    // Calculate trainer conflicts
    const currentConflicts = new Set();
    const trainerBookings = {};

    activeMembersForConflict.forEach(m => {
      if (m.assignedTrainer) {
        const tId = m.assignedTrainer._id.toString();
        const isTrainerActive = activeTrainers.some(t => t._id.toString() === tId);

        if (!isTrainerActive || !isTrainerCompatible(m.assignedTrainer, m.timeSlot, timeSlots)) {
          currentConflicts.add(`shift_conflict_${m._id}`);
        }

        if (isTrainerActive && m.timeSlot) {
          if (!trainerBookings[tId]) trainerBookings[tId] = {};
          if (!trainerBookings[tId][m.timeSlot]) trainerBookings[tId][m.timeSlot] = [];
          trainerBookings[tId][m.timeSlot].push(m._id.toString());
        }
      }
    });

    for (const tId in trainerBookings) {
      for (const slotName in trainerBookings[tId]) {
        if (trainerBookings[tId][slotName].length > 2) {
          currentConflicts.add(`overbooked_${tId}_${slotName}`);
        }
      }
    }

    const unpaidEmployeeNames = new Set();

    activeStaff.forEach(s => {
      const nameLower = s.name.toLowerCase();
      const hasExpense = prevMonthExpenses.some(e => {
        const titleLower = e.title.toLowerCase();
        const isSalaryCategory = (e.category || '').toLowerCase().includes('salary');
        const isSalaryTitle = titleLower.includes('salary');
        return (isSalaryCategory || isSalaryTitle) && titleLower.includes(nameLower);
      });
      if (!hasExpense) {
        unpaidEmployeeNames.add(nameLower);
      }
    });

    activeTrainers.forEach(t => {
      const nameLower = t.name.toLowerCase();
      const hasExpense = prevMonthExpenses.some(e => {
        const titleLower = e.title.toLowerCase();
        const isSalaryCategory = (e.category || '').toLowerCase().includes('salary');
        const isSalaryTitle = titleLower.includes('salary');
        return (isSalaryCategory || isSalaryTitle) && titleLower.includes(nameLower);
      });
      if (!hasExpense) {
        unpaidEmployeeNames.add(nameLower);
      }
    });

    const resolvedAlertIds = [];

    activeAlerts.forEach(a => {
      // 1. Dropout checks
      if (a.type === 'dropout') {
        if (!a.relatedMember) {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.status !== 'active') {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.lastAttendance && new Date(a.relatedMember.lastAttendance) >= fiveDaysAgo) {
          resolvedAlertIds.push(a._id);
        } else {
          const daysSinceJoined = (Date.now() - new Date(a.relatedMember.joinDate)) / 86400000;
          if (daysSinceJoined < 5) {
            resolvedAlertIds.push(a._id);
          }
        }
      }

      // 2. Payment Expiry checks
      if (a.type === 'payment_due') {
        if (!a.relatedMember) {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.status !== 'active') {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.planExpiry && new Date(a.relatedMember.planExpiry) > threeDaysLater) {
          resolvedAlertIds.push(a._id);
        }
      }

      // 3. Lead Follow-Up checks
      if (a.type === 'lead_followup') {
        if (!a.relatedLead) {
          resolvedAlertIds.push(a._id);
        } else if (['joined', 'lost'].includes(a.relatedLead.status)) {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedLead.followUpDate && new Date(a.relatedLead.followUpDate) > todayEnd) {
          resolvedAlertIds.push(a._id);
        }
      }

      // 4. Birthday checks
      if (a.type === 'birthday') {
        if (!a.relatedMember) {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.status !== 'active') {
          resolvedAlertIds.push(a._id);
        } else {
          const alertDate = new Date(a.createdAt);
          if (alertDate.getDate() !== todayDay || alertDate.getMonth() !== todayMonth) {
            resolvedAlertIds.push(a._id);
          }
        }
      }

      // 5. Payment Overdue checks
      if (a.type === 'payment_overdue') {
        if (!a.relatedMember) {
          resolvedAlertIds.push(a._id);
        } else if (a.relatedMember.status !== 'expired') {
          resolvedAlertIds.push(a._id);
        }
      }

      // 6. Unpaid Salary checks
      if (a.type === 'unpaid_salary') {
        const nameInTitle = a.title.replace('Unpaid Salary: ', '').toLowerCase();
        if (!unpaidEmployeeNames.has(nameInTitle)) {
          resolvedAlertIds.push(a._id);
        }
      }

      // 7. Trainer Conflict checks
      if (a.type === 'trainer_conflict') {
        if (a.title.startsWith('Trainer Shift Conflict:')) {
          if (!a.relatedMember || !currentConflicts.has(`shift_conflict_${a.relatedMember._id}`)) {
            resolvedAlertIds.push(a._id);
          }
        } else if (a.title.startsWith('Trainer Overbooked:')) {
          const match = a.message.match(/Trainer (.+?) has \d+ clients booked in the "(.+?)" slot/i);
          if (match) {
            const tName = match[1].toLowerCase();
            const slotName = match[2];
            const trainerObj = activeTrainers.find(t => t.name.toLowerCase() === tName);
            if (!trainerObj || !currentConflicts.has(`overbooked_${trainerObj._id}_${slotName}`)) {
              resolvedAlertIds.push(a._id);
            }
          } else {
            resolvedAlertIds.push(a._id);
          }
        }
      }

      // 8. Milestone checks
      if (a.type === 'milestone') {
        const alertDate = new Date(a.createdAt);
        const daysOld = (Date.now() - alertDate.getTime()) / 86400000;
        if (daysOld > 7 || !a.relatedMember || a.relatedMember.status !== 'active') {
          resolvedAlertIds.push(a._id);
        }
      }
    });

    if (resolvedAlertIds.length > 0) {
      await Alert.deleteMany({ _id: { $in: resolvedAlertIds } });
    }

    const alerts = [];

    // 1. Dropout alerts: members inactive > 5 days
    const inactiveMembers = await Member.find({
      gymOwner: req.gymOwnerId,
      status: 'active',
      joinDate: { $lte: fiveDaysAgo },
      $or: [{ lastAttendance: { $lt: fiveDaysAgo } }, { lastAttendance: null }]
    });

    for (const m of inactiveMembers) {
      const exists = await Alert.findOne({
        gymOwner: req.gymOwnerId,
        type: 'dropout', relatedMember: m._id, isDismissed: false,
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
      });
      if (!exists) {
        alerts.push({
          type: 'dropout', priority: 'high',
          title: `Dropout Risk: ${m.name}`,
          message: `${m.name} hasn't visited in ${m.lastAttendance ? Math.floor((Date.now() - m.lastAttendance) / 86400000) : 'many'} days`,
          relatedMember: m._id, actionUrl: `/members?preview=${m._id}`,
          gymOwner: req.gymOwnerId
        });
      }
    }

    // 2. Payment expiry alerts: plan expires in <= 3 days
    const expiringMembers = await Member.find({
      gymOwner: req.gymOwnerId,
      status: 'active', planExpiry: { $gte: new Date(), $lte: threeDaysLater }
    });

    for (const m of expiringMembers) {
      const days = Math.max(1, Math.ceil((m.planExpiry - Date.now()) / 86400000));
      if (days < 1 || days > 3) continue;

      const messageContent = `${m.name}'s plan expires in ${days} day(s)`;

      const existingAlert = await Alert.findOne({
        gymOwner: req.gymOwnerId,
        type: 'payment_due',
        relatedMember: m._id,
        isDismissed: false
      });

      if (existingAlert) {
        if (existingAlert.message !== messageContent) {
          await Alert.updateOne({ _id: existingAlert._id }, { isDismissed: true });
        } else {
          continue;
        }
      }

      alerts.push({
        type: 'payment_due',
        priority: days <= 1 ? 'critical' : 'high',
        title: `Plan Expiring: ${m.name}`,
        message: messageContent,
        relatedMember: m._id,
        actionUrl: `/members?preview=${m._id}`,
        gymOwner: req.gymOwnerId
      });
    }

    // 3. Lead follow-up alerts
    const followUpLeads = await Lead.find({
      gymOwner: req.gymOwnerId,
      followUpDate: { $lte: todayEnd }, status: { $nin: ['joined', 'lost'] }
    });

    for (const l of followUpLeads) {
      const exists = await Alert.findOne({
        gymOwner: req.gymOwnerId,
        type: 'lead_followup', relatedLead: l._id, isDismissed: false,
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
      });
      if (!exists) {
        alerts.push({
          type: 'lead_followup', priority: 'medium',
          title: `Follow Up: ${l.name}`,
          message: `Follow up scheduled for ${l.name} (${l.phone})`,
          relatedLead: l._id, actionUrl: `/leads?preview=${l._id}`,
          gymOwner: req.gymOwnerId
        });
      }
    }

    // 4. Birthday Today alerts
    const activeMembersForBirthdays = await Member.find({ gymOwner: req.gymOwnerId, status: 'active' });
    const birthdayMembers = activeMembersForBirthdays.filter(m => {
      if (!m.dob) return false;
      const d = new Date(m.dob);
      return d.getDate() === todayDay && d.getMonth() === todayMonth;
    });

    for (const m of birthdayMembers) {
      const exists = await Alert.findOne({
        gymOwner: req.gymOwnerId,
        type: 'birthday',
        relatedMember: m._id,
        isDismissed: false,
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
      });
      if (!exists) {
        alerts.push({
          type: 'birthday', priority: 'medium',
          title: `Birthday Today: ${m.name}`,
          message: `Wish ${m.name} a Happy Birthday today! 🎂`,
          relatedMember: m._id, actionUrl: `/members?preview=${m._id}`,
          gymOwner: req.gymOwnerId
        });
      }
    }

    // 5. Payment Overdue alerts: expired in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueMembers = await Member.find({
      gymOwner: req.gymOwnerId,
      status: 'expired',
      planExpiry: { $gte: sevenDaysAgo, $lte: new Date() }
    });

    for (const m of overdueMembers) {
      const exists = await Alert.findOne({
        gymOwner: req.gymOwnerId,
        type: 'payment_overdue',
        relatedMember: m._id,
        isDismissed: false
      });
      if (!exists) {
        const expFormatted = new Date(m.planExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        alerts.push({
          type: 'payment_overdue', priority: 'critical',
          title: `Membership Expired: ${m.name}`,
          message: `${m.name}'s plan expired on ${expFormatted}. Contact them for renewal payment of ₹${(m.planAmount || m.renewalAmount || 0).toLocaleString()}`,
          relatedMember: m._id, actionUrl: `/members?preview=${m._id}`,
          gymOwner: req.gymOwnerId
        });
      }
    }

    // 6. Unpaid salaries alerts: previous month
    for (const s of activeStaff) {
      const nameLower = s.name.toLowerCase();
      if (unpaidEmployeeNames.has(nameLower)) {
        const exists = await Alert.findOne({
          gymOwner: req.gymOwnerId,
          type: 'unpaid_salary',
          title: `Unpaid Salary: ${s.name}`,
          isDismissed: false
        });
        if (!exists) {
          alerts.push({
            type: 'unpaid_salary', priority: 'high',
            title: `Unpaid Salary: ${s.name}`,
            message: `Salary for staff member ${s.name} is unpaid for the previous month (₹${(s.salary || 0).toLocaleString()}).`,
            actionUrl: `/staff`,
            gymOwner: req.gymOwnerId
          });
        }
      }
    }

    for (const t of activeTrainers) {
      const nameLower = t.name.toLowerCase();
      if (unpaidEmployeeNames.has(nameLower)) {
        const exists = await Alert.findOne({
          gymOwner: req.gymOwnerId,
          type: 'unpaid_salary',
          title: `Unpaid Salary: ${t.name}`,
          isDismissed: false
        });
        if (!exists) {
          alerts.push({
            type: 'unpaid_salary', priority: 'high',
            title: `Unpaid Salary: ${t.name}`,
            message: `Salary/commission for trainer ${t.name} is unpaid for the previous month (₹${(t.salary || t.compensation || 0).toLocaleString()}).`,
            actionUrl: `/trainers`,
            gymOwner: req.gymOwnerId
          });
        }
      }
    }

    // 7. Trainer Shift Conflict and Overbooking alerts
    for (const m of activeMembersForConflict) {
      if (m.assignedTrainer) {
        const isTrainerActive = activeTrainers.some(t => t._id.toString() === m.assignedTrainer._id.toString());
        const isConflict = !isTrainerActive || !isTrainerCompatible(m.assignedTrainer, m.timeSlot, timeSlots);

        if (isConflict) {
          const exists = await Alert.findOne({
            gymOwner: req.gymOwnerId,
            type: 'trainer_conflict',
            title: `Trainer Shift Conflict: ${m.name}`,
            isDismissed: false
          });
          if (!exists) {
            alerts.push({
              type: 'trainer_conflict', priority: 'high',
              title: `Trainer Shift Conflict: ${m.name}`,
              message: `${m.name} is assigned to Trainer ${m.assignedTrainer.name} but their slot (${m.timeSlot || 'None'}) is outside the trainer's hours.`,
              relatedMember: m._id, actionUrl: `/members?preview=${m._id}`,
              gymOwner: req.gymOwnerId
            });
          }
        }
      }
    }

    // Overbooking alerts: if a trainer has > 2 active clients in same slot
    for (const tId in trainerBookings) {
      const trainerObj = activeTrainers.find(t => t._id.toString() === tId);
      if (!trainerObj) continue;

      for (const slotName in trainerBookings[tId]) {
        const bookingsCount = trainerBookings[tId][slotName].length;
        if (bookingsCount > 2) {
          const exists = await Alert.findOne({
            gymOwner: req.gymOwnerId,
            type: 'trainer_conflict',
            title: `Trainer Overbooked: ${trainerObj.name}`,
            message: new RegExp(`Trainer ${trainerObj.name} has \\d+ clients booked in the "${slotName}" slot`, 'i'),
            isDismissed: false
          });
          if (!exists) {
            alerts.push({
              type: 'trainer_conflict', priority: 'high',
              title: `Trainer Overbooked: ${trainerObj.name}`,
              message: `Trainer ${trainerObj.name} has ${bookingsCount} clients booked in the "${slotName}" slot (Max 2).`,
              actionUrl: `/trainers`,
              gymOwner: req.gymOwnerId
            });
          }
        }
      }
    }

    // 8. Member Attendance Milestone alerts
    const milestoneCheckpoints = [10, 25, 50, 100, 250, 500];
    for (const m of activeMembersForConflict) {
      if (m.totalAttendance && milestoneCheckpoints.includes(m.totalAttendance)) {
        const exists = await Alert.findOne({
          gymOwner: req.gymOwnerId,
          type: 'milestone',
          relatedMember: m._id,
          title: `Attendance Milestone: ${m.name}`,
          message: new RegExp(`completed ${m.totalAttendance} workouts`, 'i'),
          isDismissed: false
        });
        if (!exists) {
          alerts.push({
            type: 'milestone', priority: 'medium',
            title: `Attendance Milestone: ${m.name}`,
            message: `Congratulations! ${m.name} has completed ${m.totalAttendance} workouts at your gym! 🏆`,
            relatedMember: m._id, actionUrl: `/members?preview=${m._id}`,
            gymOwner: req.gymOwnerId
          });
        }
      }
    }

    if (alerts.length > 0) await Alert.insertMany(alerts);

    res.status(200).json({ success: true, generated: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAlertCounts = async (req, res) => {
  try {
    if (!req.gymOwnerId) {
      return res.status(200).json({ success: true, data: { unread: 0, byType: [] } });
    }

    // If zero records are in the system, count of alerts is always 0
    const memberCount = await Member.countDocuments({ gymOwner: req.gymOwnerId });
    const leadCount = await Lead.countDocuments({ gymOwner: req.gymOwnerId });
    if (memberCount === 0 && leadCount === 0) {
      await Alert.deleteMany({ gymOwner: req.gymOwnerId });
      return res.status(200).json({ success: true, data: { unread: 0, byType: [] } });
    }

    const unread = await Alert.countDocuments({ gymOwner: req.gymOwnerId, isRead: false, isDismissed: false });
    const byType = await Alert.aggregate([
      { $match: { gymOwner: req.gymOwnerId, isDismissed: false, isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: { unread, byType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
