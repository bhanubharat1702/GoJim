const Expense = require('../models/Expense');

exports.getExpenses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    
    // Support filtering by category or date range if needed
    const query = { gymOwner: req.user.id };
    
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort('-date')
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: expenses.length, 
      total,
      pages: Math.ceil(total / limit),
      page,
      data: expenses 
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    req.body.gymOwner = req.user.id;
    const expense = await Expense.create(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, gymOwner: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    await expense.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getExpenseStats = async (req, res) => {
  try {
    const gymOwner = req.user.id;
    const now = new Date();
    
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthlyExpenses = await Expense.aggregate([
      { $match: { gymOwner: gymOwner, category: { $ne: 'Salary' }, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const todayExpenses = await Expense.aggregate([
      { $match: { gymOwner: gymOwner, category: { $ne: 'Salary' }, date: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthlyTotal: monthlyExpenses[0]?.total || 0,
        monthlyCount: monthlyExpenses[0]?.count || 0,
        todayTotal: todayExpenses[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
