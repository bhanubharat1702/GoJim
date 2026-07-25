const Staff = require('../models/Staff');
const User = require('../models/User');

// @desc    Get all staff
// @route   GET /api/staff
exports.getStaff = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = { gymOwner: req.gymOwnerId };

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

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const staff = await Staff.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new staff
// @route   POST /api/staff
exports.createStaff = async (req, res) => {
  try {
    req.body.gymOwner = req.gymOwnerId;
    if (req.body.phone) {
      const existingStaff = await Staff.findOne({ phone: req.body.phone, gymOwner: req.gymOwnerId });
      if (existingStaff) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another staff member' });
      }
    }

    // Check subscription plan staff limit
    const owner = await User.findById(req.gymOwnerId).populate('subscriptionPlan');
    if (owner && owner.subscriptionPlan) {
      const currentStaffCount = await Staff.countDocuments({ gymOwner: req.gymOwnerId });
      if (currentStaffCount >= owner.subscriptionPlan.maxStaff) {
        return res.status(400).json({ 
          success: false, 
          limitReached: true,
          message: `You have reached your plan limit of ${owner.subscriptionPlan.maxStaff} staff members. Please upgrade your software subscription to add more staff.` 
        });
      }
    }

    const staff = await Staff.create(req.body);
    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff
// @route   PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
  try {
    let staff = await Staff.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found or not authorized' });

    if (req.body.phone) {
      const existingStaff = await Staff.findOne({
        phone: req.body.phone,
        gymOwner: req.gymOwnerId,
        _id: { $ne: req.params.id }
      });
      if (existingStaff) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another staff member' });
      }
    }

    staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found or not authorized' });

    // Automatically delete attendance details for the staff
    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({
      member: req.params.id,
      gymOwner: req.gymOwnerId
    });

    await staff.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle staff active/inactive status
// @route   PATCH /api/staff/:id/toggle-status
exports.toggleStaffStatus = async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    staff.status = staff.status === 'active' ? 'inactive' : 'active';
    await staff.save();

    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
