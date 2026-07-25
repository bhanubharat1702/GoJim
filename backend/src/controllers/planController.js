const Plan = require('../models/Plan');

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ gymOwner: req.gymOwnerId }).sort({ durationMonths: 1 });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create({
      ...req.body,
      gymOwner: req.gymOwnerId
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findOneAndUpdate(
      { _id: req.params.id, gymOwner: req.gymOwnerId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOneAndDelete({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
