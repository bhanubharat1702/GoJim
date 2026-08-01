const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Trainer = require('../models/Trainer');
const Staff = require('../models/Staff');

// @desc    Check in member, trainer, or staff (self or staff)
// @route   POST /api/attendance/checkin
exports.checkIn = async (req, res) => {
  try {
    const { phone, memberId, markedBy = 'self', role = 'clients', date } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const serverToday = new Date().toISOString().split('T')[0];

    if (today < serverToday) {
      return res.status(400).json({ success: false, message: 'Modifications are not allowed for past dates.' });
    }
    if (today > serverToday) {
      return res.status(400).json({ success: false, message: 'Check-ins are not allowed for future dates.' });
    }

    let targetId = memberId;
    let roleModel = 'Member';

    if (role === 'clients') {
      roleModel = 'Member';
      let member;
      if (memberId) {
        member = await Member.findOne({ _id: memberId, gymOwner: req.gymOwnerId });
      } else if (phone) {
        member = await Member.findOne({ phone, gymOwner: req.gymOwnerId });
      }

      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found.' });
      }
      if (member.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Membership is not active.' });
      }

      targetId = member._id;
    } 
    else if (role === 'trainers') {
      roleModel = 'Trainer';
      const trainer = await Trainer.findOne({ _id: targetId, gymOwner: req.gymOwnerId });
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found.' });
      }
    } 
    else if (role === 'staff') {
      roleModel = 'Staff';
      const staff = await Staff.findOne({ _id: targetId, gymOwner: req.gymOwnerId });
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Staff member not found.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    // Check if already checked in today as present
    const existing = await Attendance.findOne({ member: targetId, date: today, gymOwner: req.gymOwnerId });
    if (existing && existing.status === 'present') {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for this date!'
      });
    }

    const d = new Date();
    const localTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const checkInTimeVal = (date && date !== localTodayStr) ? new Date(date + 'T12:00:00') : new Date();

    const attendance = await Attendance.findOneAndUpdate(
      { gymOwner: req.gymOwnerId, member: targetId, date: today },
      {
        member: targetId,
        roleModel,
        status: 'present',
        markedBy,
        checkInTime: checkInTimeVal
      },
      { upsert: true, new: true }
    );

    // Update member's last attendance and total count if client role
    if (role === 'clients' && (!existing || existing.status !== 'present')) {
      await Member.findOneAndUpdate({ _id: targetId, gymOwner: req.gymOwnerId }, {
        lastAttendance: new Date(),
        $inc: { totalAttendance: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Check-in processed successfully',
      data: {
        checkInTime: attendance.checkInTime
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get today's attendance
// @route   GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.find({ date: today, gymOwner: req.gymOwnerId })
      .populate('member')
      .sort({ checkInTime: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      date: today,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance by date range or specific user
// @route   GET /api/attendance
exports.getAttendance = async (req, res) => {
  try {
    const { startDate, endDate, memberId, trainerId, staffId } = req.query;
    const query = { gymOwner: req.gymOwnerId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (memberId) {
      query.member = memberId;
    }
    if (trainerId) {
      query.member = trainerId;
    }
    if (staffId) {
      query.member = staffId;
    }

    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate('member')
      .sort({ date: -1, checkInTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: attendance.length, 
      total,
      pages: Math.ceil(total / limit),
      page,
      data: attendance 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance stats
// @route   GET /api/attendance/stats
exports.getAttendanceStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await Attendance.countDocuments({ date: today, gymOwner: req.gymOwnerId });

    // Last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Attendance.countDocuments({ date: dateStr, gymOwner: req.gymOwnerId });
      last7Days.push({ date: dateStr, day: d.toLocaleDateString('en', { weekday: 'short' }), count });
    }

    // This month total unique members
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().split('T')[0];

    const monthlyUnique = await Attendance.distinct('member', {
      date: { $gte: monthStart },
      gymOwner: req.gymOwnerId
    });

    res.status(200).json({
      success: true,
      data: {
        todayCount,
        last7Days,
        monthlyUniqueMembers: monthlyUnique.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark member, trainer, or staff as absent (set status to absent)
// @route   DELETE /api/attendance/absent
exports.markAbsent = async (req, res) => {
  try {
    const { memberId, date, role = 'clients' } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const serverToday = new Date().toISOString().split('T')[0];

    if (today < serverToday) {
      return res.status(400).json({ success: false, message: 'Modifications are not allowed for past dates.' });
    }
    if (today > serverToday) {
      return res.status(400).json({ success: false, message: 'Clicks are not allowed for future dates.' });
    }

    let roleModel = 'Member';
    if (role === 'clients') roleModel = 'Member';
    else if (role === 'trainers') roleModel = 'Trainer';
    else if (role === 'staff') roleModel = 'Staff';

    const existing = await Attendance.findOne({ member: memberId, date: today, gymOwner: req.gymOwnerId });

    await Attendance.findOneAndUpdate(
      { gymOwner: req.gymOwnerId, member: memberId, date: today },
      {
        member: memberId,
        roleModel,
        status: 'absent',
        markedBy: 'staff',
        checkInTime: date ? new Date(date + 'T12:00:00') : new Date()
      },
      { upsert: true }
    );

    if (role === 'clients' && existing && existing.status === 'present') {
      // Decrement only if they were previously present
      await Member.findOneAndUpdate({ _id: memberId, gymOwner: req.gymOwnerId }, {
        $inc: { totalAttendance: -1 }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marked as absent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unmark attendance (delete today's attendance record entirely)
// @route   DELETE /api/attendance/unmark
exports.unmarkAttendance = async (req, res) => {
  try {
    const { memberId, date, role = 'clients' } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const serverToday = new Date().toISOString().split('T')[0];

    if (today < serverToday) {
      return res.status(400).json({ success: false, message: 'Modifications are not allowed for past dates.' });
    }
    if (today > serverToday) {
      return res.status(400).json({ success: false, message: 'Clicks are not allowed for future dates.' });
    }

    const existing = await Attendance.findOne({ member: memberId, date: today, gymOwner: req.gymOwnerId });
    if (!existing) {
      return res.status(200).json({ success: true, message: 'Already unmarked.' });
    }

    await Attendance.deleteOne({ member: memberId, date: today, gymOwner: req.gymOwnerId });

    if (role === 'clients' && existing.status === 'present') {
      // Decrement only if they were previously present
      await Member.findOneAndUpdate({ _id: memberId, gymOwner: req.gymOwnerId }, {
        $inc: { totalAttendance: -1 }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check out member, trainer, or staff (record out time)
// @route   POST /api/attendance/checkout
exports.checkOut = async (req, res) => {
  try {
    const { memberId, date, role = 'trainers' } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const serverToday = new Date().toISOString().split('T')[0];

    if (today < serverToday) {
      return res.status(400).json({ success: false, message: 'Modifications are not allowed for past dates.' });
    }
    if (today > serverToday) {
      return res.status(400).json({ success: false, message: 'Check-outs are not allowed for future dates.' });
    }

    const attendance = await Attendance.findOne({ member: memberId, date: today, gymOwner: req.gymOwnerId });
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found for this date. Please check in first.' });
    }

    if (attendance.checkOutTime) {
      attendance.checkOutTime = null; // Toggle off checkOutTime!
    } else {
      attendance.checkOutTime = new Date();
    }
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Check-out processed successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
