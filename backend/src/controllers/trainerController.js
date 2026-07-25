const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const User = require('../models/User');

// @desc    Get all trainers
// @route   GET /api/trainers
exports.getTrainers = async (req, res) => {
  try {
    const { search, specialty, sort } = req.query;
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

    if (specialty && specialty !== 'all') {
      query.specialties = specialty;
    }

    const trainers = await Trainer.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'members',
          let: { trainerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTrainer', '$$trainerId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            }
          ],
          as: 'assignedMembers'
        }
      },
      {
        $addFields: {
          clientCount: { $size: '$assignedMembers' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new trainer
// @route   POST /api/trainers
exports.createTrainer = async (req, res) => {
  try {
    req.body.gymOwner = req.gymOwnerId;
    if (req.body.phone) {
      const existingTrainer = await Trainer.findOne({ phone: req.body.phone, gymOwner: req.gymOwnerId });
      if (existingTrainer) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another trainer' });
      }
    }

    // Check subscription plan trainer limit
    const owner = await User.findById(req.gymOwnerId).populate('subscriptionPlan');
    if (owner && owner.subscriptionPlan) {
      const currentTrainersCount = await Trainer.countDocuments({ gymOwner: req.gymOwnerId });
      if (currentTrainersCount >= owner.subscriptionPlan.maxTrainers) {
        return res.status(400).json({ 
          success: false, 
          limitReached: true,
          message: `You have reached your plan limit of ${owner.subscriptionPlan.maxTrainers} trainers. Please upgrade your software subscription to add more trainers.` 
        });
      }
    }

    const trainer = await Trainer.create(req.body);
    res.status(201).json({ success: true, data: trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update trainer
// @route   PUT /api/trainers/:id
exports.updateTrainer = async (req, res) => {
  try {
    let trainer = await Trainer.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found or not authorized' });

    if (req.body.phone) {
      const existingTrainer = await Trainer.findOne({
        phone: req.body.phone,
        gymOwner: req.gymOwnerId,
        _id: { $ne: req.params.id }
      });
      if (existingTrainer) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered to another trainer' });
      }
    }

    trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // Disconnect assigned members if trainer becomes inactive
    if (req.body.status === 'inactive') {
      await Member.updateMany(
        { assignedTrainer: req.params.id, gymOwner: req.gymOwnerId },
        { $set: { assignedTrainer: null } }
      );
    }

    res.status(200).json({ success: true, data: trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete trainer
// @route   DELETE /api/trainers/:id
exports.deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found or not authorized' });

    // Automatically delete attendance details for the trainer
    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({
      member: req.params.id,
      gymOwner: req.gymOwnerId
    });

    // Optionally delete matching salary expenses if requested
    if (req.query.deletePayments === 'true') {
      const Expense = require('../models/Expense');
      const escapedName = trainer.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      await Expense.deleteMany({
        gymOwner: req.gymOwnerId,
        category: 'Salary',
        title: { $regex: new RegExp(escapedName, 'i') }
      });
    }

    // Disconnect assigned members
    await Member.updateMany(
      { assignedTrainer: req.params.id, gymOwner: req.gymOwnerId },
      { $set: { assignedTrainer: null } }
    );

    await trainer.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle trainer active/inactive status
// @route   PATCH /api/trainers/:id/toggle-status
exports.toggleTrainerStatus = async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    trainer.status = trainer.status === 'active' ? 'inactive' : 'active';
    await trainer.save();

    // Disconnect assigned members if trainer becomes inactive
    if (trainer.status === 'inactive') {
      await Member.updateMany(
        { assignedTrainer: trainer._id, gymOwner: req.gymOwnerId },
        { $set: { assignedTrainer: null } }
      );
    }

    res.status(200).json({ success: true, data: trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
