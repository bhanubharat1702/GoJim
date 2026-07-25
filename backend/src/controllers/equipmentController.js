const Equipment = require('../models/Equipment');

// @desc    Get all active equipment (non-soft-deleted) with optional filters
// @route   GET /api/equipment
// @access  Private
exports.getEquipments = async (req, res) => {
  try {
    const query = {
      gymOwner: req.gymOwnerId,
      isDeleted: { $ne: true }
    };

    // Apply filters if provided
    if (req.query.search) {
      query.equipmentName = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    const equipments = await Equipment.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: equipments.length, data: equipments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single equipment
// @route   GET /api/equipment/:id
// @access  Private
exports.getEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.params.id,
      gymOwner: req.gymOwnerId,
      isDeleted: { $ne: true }
    });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    res.status(200).json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private
exports.createEquipment = async (req, res) => {
  try {
    const { equipmentName, category, quantity, status, notes } = req.body;

    if (!equipmentName || !category || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const equipment = await Equipment.create({
      equipmentName,
      category,
      quantity,
      status: status || 'Available',
      notes: notes || '',
      gymOwner: req.gymOwnerId
    });

    res.status(201).json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update equipment details
// @route   PUT /api/equipment/:id
// @access  Private
exports.updateEquipment = async (req, res) => {
  try {
    const { equipmentName, category, quantity, status, notes } = req.body;

    let equipment = await Equipment.findOne({
      _id: req.params.id,
      gymOwner: req.gymOwnerId,
      isDeleted: { $ne: true }
    });

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    equipment = await Equipment.findOneAndUpdate(
      { _id: req.params.id, gymOwner: req.gymOwnerId },
      { equipmentName, category, quantity, status, notes },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick status change
// @route   PATCH /api/equipment/:id/status
// @access  Private
exports.updateEquipmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Available', 'Under Maintenance', 'Not Available'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid status' });
    }

    const equipment = await Equipment.findOneAndUpdate(
      { _id: req.params.id, gymOwner: req.gymOwnerId, isDeleted: { $ne: true } },
      { status },
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    res.status(200).json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private
exports.deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOneAndUpdate(
      { _id: req.params.id, gymOwner: req.gymOwnerId, isDeleted: { $ne: true } },
      { isDeleted: true },
      { new: true }
    );

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    res.status(200).json({ success: true, message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
