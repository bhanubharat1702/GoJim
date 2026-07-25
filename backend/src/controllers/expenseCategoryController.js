const ExpenseCategory = require('../models/ExpenseCategory');

const DEFAULT_CATEGORIES = [
  { name: 'Rent', titles: ["Gym Rent", "Parking Rent", "Storage Rent", "Other"] },
  { name: 'Utilities', titles: ["Electricity Bill", "Water Bill", "Generator Fuel", "Other"] },
  { name: 'Maintenance', titles: ["Treadmill Repair", "Cable Replacement", "Machine Service", "AC Repair", "Other"] },
  { name: 'Marketing', titles: ["Instagram Ads", "Banner Printing", "Referral Campaign", "Other"] },
  { name: 'Cleaning', titles: ["Cleaning Supplies", "Sanitizer", "Washroom Supplies", "Other"] },
  { name: 'Internet', titles: ["WiFi Bill", "Software Subscription", "CCTV Subscription", "Other"] },
  { name: 'Equipment', titles: ["New Dumbbells", "Yoga Mats", "Resistance Bands", "Other"] },
  { name: 'Miscellaneous', titles: ["Furniture Repair", "Festival Decoration", "Office Supplies", "Other"] }
];

exports.getExpenseCategories = async (req, res) => {
  try {
    const PlatformSettings = require('../models/PlatformSettings');
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    
    res.status(200).json({ success: true, data: settings.expenseCategories && settings.expenseCategories.length > 0 ? settings.expenseCategories : DEFAULT_CATEGORIES });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createExpenseCategory = async (req, res) => {
  try {
    req.body.gymOwner = req.user.id;
    const nameTrimmed = req.body.name ? req.body.name.trim() : '';
    if (!nameTrimmed) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    
    // Check if category name already exists (case-insensitive)
    const existing = await ExpenseCategory.findOne({
      gymOwner: req.user.id,
      name: { $regex: new RegExp(`^${nameTrimmed}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Category name already exists' });
    }
    
    const category = await ExpenseCategory.create({
      name: nameTrimmed,
      titles: req.body.titles || ['Other'],
      gymOwner: req.user.id
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateExpenseCategory = async (req, res) => {
  try {
    const category = await ExpenseCategory.findOne({ _id: req.params.id, gymOwner: req.user.id });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    if (req.body.name) {
      const nameTrimmed = req.body.name.trim();
      if (!nameTrimmed) {
        return res.status(400).json({ success: false, error: 'Category name cannot be empty' });
      }
      const existing = await ExpenseCategory.findOne({
        gymOwner: req.user.id,
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${nameTrimmed}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Category name already exists' });
      }
      category.name = nameTrimmed;
    }
    
    if (req.body.titles) {
      category.titles = req.body.titles;
    }
    
    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteExpenseCategory = async (req, res) => {
  try {
    const category = await ExpenseCategory.findOne({ _id: req.params.id, gymOwner: req.user.id });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    await category.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.resetExpenseCategories = async (req, res) => {
  try {
    const gymOwner = req.user.id;
    await ExpenseCategory.deleteMany({ gymOwner });
    
    const docs = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      gymOwner
    }));
    const categories = await ExpenseCategory.insertMany(docs);
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
