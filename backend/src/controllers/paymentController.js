const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Plan = require('../models/Plan');

const calculateExpiry = async (anchorDate, planName, gymOwnerId) => {
  const date = new Date(anchorDate);
  
  // Try to find the plan in the database for dynamic duration
  const planDoc = await Plan.findOne({ name: planName, gymOwner: gymOwnerId });
  
  let monthsToAdd = 1;
  if (planDoc) {
    monthsToAdd = planDoc.durationMonths;
  } else {
    // Fallback to legacy hardcoded plans
    const monthsMap = {
      'monthly': 1,
      'quarterly': 3,
      'half-yearly': 6,
      'yearly': 12
    };
    monthsToAdd = monthsMap[planName.toLowerCase()] || 1;
  }
  
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

exports.createPayment = async (req, res) => {
  try {
    const { memberId, amount, plan, paymentMethod, notes, newExpiry: customExpiry, isPtPayment, upiId } = req.body;
    const now = new Date();
    const member = await Member.findOne({ _id: memberId, gymOwner: req.gymOwnerId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    // Anchor logic:
    // 1. If payFromCurrentDate is true -> Anchor to TODAY (system current date)
    // 2. If status is 'exited' or 'inactive', they are starting fresh or resuming -> Anchor to TODAY
    // 3. If planExpiry exists and is recent, we anchor to it to maintain the billing cycle
    // 4. Otherwise Fallback to TODAY
    let anchorDate = now;
    if (req.body.payFromCurrentDate) {
      anchorDate = now;
    } else if (member.status !== 'exited' && member.status !== 'inactive' && member.planExpiry) {
      anchorDate = member.planExpiry;
    }
    
    const newExpiry = customExpiry ? new Date(customExpiry) : await calculateExpiry(anchorDate, plan, req.gymOwnerId);

    const calculatedIsPtPayment = isPtPayment || (notes && (notes.toLowerCase().includes('pt') || notes.toLowerCase().includes('personal'))) || false;

    const payment = await Payment.create({
      member: memberId, amount, plan,
      paymentMethod: paymentMethod || 'cash',
      newExpiry, notes, receivedBy: req.user.id,
      gymOwner: req.gymOwnerId,
      isPtPayment: calculatedIsPtPayment,
      upiId: upiId || ''
    });

    // Update member status based on new expiry date
    // If new expiry is in the future, it's active. If still in past, it's expired (overdue).
    const updatedStatus = newExpiry > now ? 'active' : 'expired';

    const memberUpdateFields = {
      plan, planAmount: amount, planExpiry: newExpiry, status: updatedStatus, lastAttendance: new Date()
    };
    if (upiId) {
      memberUpdateFields.upiId = upiId;
    }

    await Member.findOneAndUpdate({ _id: memberId, gymOwner: req.gymOwnerId }, memberUpdateFields);

    // Log member payment
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'Payment Received',
      performedBy: req.user.name,
      affectedEntity: req.user.gymName,
      gymOwner: req.gymOwnerId,
      details: `Received payment of INR ${amount} from member ${member.name} for plan: ${plan} (Expiry: ${newExpiry.toLocaleDateString()})`
    });

    res.status(201).json({ success: true, data: payment, newExpiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { memberId, status, page = 1, limit = 20 } = req.query;
    const query = { gymOwner: req.gymOwnerId };
    if (memberId) query.member = memberId;
    if (status) query.status = status;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('member', 'name phone plan status gender joinDate planExpiry')
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));

    res.status(200).json({ success: true, count: payments.length, total, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentStats = async (req, res) => {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { gymOwner: req.gymOwnerId, paymentDate: { $gte: firstOfMonth, $lte: lastOfMonth }, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const todayRevenue = await Payment.aggregate([
      { $match: { gymOwner: req.gymOwnerId, paymentDate: { $gte: todayStart, $lte: todayEnd }, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { gymOwner: req.gymOwnerId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        todayIncome: todayRevenue[0]?.total || 0,
        monthlyIncome: monthlyRevenue[0]?.total || 0,
        totalIncome: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMemberPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ member: req.params.memberId, gymOwner: req.gymOwnerId })
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentsOverview = async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const Trainer = require('../models/Trainer');
    const Staff = require('../models/Staff');
    const Member = require('../models/Member');
    const Payment = require('../models/Payment');

    const { filter = 'month', startDate, endDate } = req.query;
    const now = new Date();
    
    // Parse filter dates
    let start = null;
    let end = null;
    
    if (filter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filter === 'week') {
      // Last 7 days
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (filter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filter === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filter === 'custom') {
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    const dateQuery = {};
    if (start || end) {
      dateQuery.paymentDate = {};
      if (start) dateQuery.paymentDate.$gte = start;
      if (end) dateQuery.paymentDate.$lte = end;
    }

    const expenseDateQuery = {};
    if (start || end) {
      expenseDateQuery.date = {};
      if (start) expenseDateQuery.date.$gte = start;
      if (end) expenseDateQuery.date.$lte = end;
    }

    // 1. COLLECTIONS SUMMARY
    const paymentsQuery = { gymOwner: req.gymOwnerId, status: 'paid', ...dateQuery };
    const allMatchingPayments = await Payment.find(paymentsQuery).populate('member', 'name phone plan status gender joinDate planExpiry');
    
    let totalCollected = 0;
    let ptCollected = 0;
    let membershipCollected = 0;
    let otherIncomeCollected = 0;
    
    allMatchingPayments.forEach(p => {
      const planName = (p.plan || '').toLowerCase();
      const notes = (p.notes || '').toLowerCase();
      const isPT = planName.includes('pt') || planName.includes('personal') || notes.includes('pt') || notes.includes('personal');
      const isOther = planName.includes('other') || notes.includes('other');
      
      if (isPT) {
        ptCollected += p.amount;
      } else if (isOther) {
        otherIncomeCollected += p.amount;
      } else {
        membershipCollected += p.amount;
      }
      totalCollected += p.amount;
    });

    // Collected This Week (always last 7 days from today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);
    const thisWeekPayments = await Payment.find({
      gymOwner: req.gymOwnerId,
      status: 'paid',
      paymentDate: { $gte: sevenDaysAgo }
    });
    const collectedThisWeek = thisWeekPayments.reduce((sum, p) => sum + p.amount, 0);

    // Percentage Change Compared To Previous Month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [currentMonthSumData, lastMonthSumData] = await Promise.all([
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'paid', paymentDate: { $gte: currentMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { gymOwner: req.gymOwnerId, status: 'paid', paymentDate: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const currentMonthCollection = currentMonthSumData[0]?.total || 0;
    const lastMonthCollection = lastMonthSumData[0]?.total || 0;
    
    let percentageChange = 'No comparison available';
    if (lastMonthCollection > 0) {
      percentageChange = Math.round(((currentMonthCollection - lastMonthCollection) / lastMonthCollection) * 100);
    }

    // 2. PENDING COLLECTIONS
    // Unpaid/expired active memberships + payment dues
    const activeMembers = await Member.find({ gymOwner: req.gymOwnerId, status: { $ne: 'exited' } });
    
    let pendingAmount = 0;
    let pendingMembersCount = 0;
    let overdueMembersCount = 0;
    const pendingRecoveryList = [];

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    // Check members for active/expired status and compute dues
    activeMembers.forEach(m => {
      const planExpiryDate = m.planExpiry ? new Date(m.planExpiry) : null;
      if (planExpiryDate && planExpiryDate < todayStart && m.status !== 'inactive') {
        const daysOverdue = Math.max(0, Math.floor((todayStart - planExpiryDate) / (1000 * 60 * 60 * 24)));
        const amountDue = m.renewalAmount || m.planAmount || 0;
        
        pendingAmount += amountDue;
        pendingMembersCount++;
        if (daysOverdue > 0) {
          overdueMembersCount++;
        }
        
        pendingRecoveryList.push({
          memberId: m._id,
          memberName: m.name,
          planName: m.plan,
          pendingAmount: amountDue,
          dueDate: planExpiryDate,
          daysOverdue,
          status: daysOverdue > 0 ? 'Overdue' : 'Pending'
        });
      }
    });

    // Add any explicit overdue/pending payment records in db if any
    const explicitPendingPayments = await Payment.find({
      gymOwner: req.gymOwnerId,
      status: { $in: ['pending', 'overdue', 'partial'] }
    }).populate('member', 'name status plan');
    
    explicitPendingPayments.forEach(p => {
      const exists = pendingRecoveryList.some(item => item.memberId.toString() === p.member?._id?.toString());
      if (!exists && p.member) {
        const dueDate = p.dueDate || p.paymentDate || new Date();
        const daysOverdue = Math.max(0, Math.floor((todayStart - new Date(dueDate)) / (1000 * 60 * 60 * 24)));
        
        pendingAmount += p.amount;
        pendingMembersCount++;
        if (daysOverdue > 0) {
          overdueMembersCount++;
        }
        
        pendingRecoveryList.push({
          memberId: p.member._id,
          memberName: p.member.name,
          planName: p.plan || p.member.plan,
          pendingAmount: p.amount,
          dueDate: dueDate,
          daysOverdue,
          status: daysOverdue > 0 ? 'Overdue' : 'Pending'
        });
      }
    });

    // 3. RENEWAL PIPELINE
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    thirtyDaysLater.setHours(23,59,59,999);
    
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(23,59,59,999);

    let expectedRenewalValue = 0;
    let totalRenewalsDue = 0;
    let renewalsDue7Days = 0;
    const renewalDueList = [];

    activeMembers.forEach(m => {
      const planExpiryDate = m.planExpiry ? new Date(m.planExpiry) : null;
      if (m.status === 'active' && planExpiryDate && planExpiryDate >= todayStart) {
        const daysRemaining = Math.max(0, Math.ceil((planExpiryDate - todayStart) / (1000 * 60 * 60 * 24)));
        const renewalAmt = m.renewalAmount || m.planAmount || 0;

        if (planExpiryDate <= thirtyDaysLater) {
          expectedRenewalValue += renewalAmt;
          totalRenewalsDue++;
          
          if (planExpiryDate <= sevenDaysLater) {
            renewalsDue7Days++;
          }

          renewalDueList.push({
            memberId: m._id,
            memberName: m.name,
            planName: m.plan,
            expiryDate: planExpiryDate,
            renewalAmount: renewalAmt,
            daysRemaining
          });
        }
      }
    });

    // 4. OUTGOING PAYMENTS
    const expensesQuery = { gymOwner: req.gymOwnerId, ...expenseDateQuery };
    const allExpenses = await Expense.find(expensesQuery);
    
    let salaryExpenses = 0;
    let otherExpenses = 0;
    
    allExpenses.forEach(e => {
      if (e.category === 'Salary') {
        salaryExpenses += e.amount;
      } else {
        otherExpenses += e.amount;
      }
    });
    
    const totalOutgoingThisMonth = salaryExpenses + otherExpenses;

    // 5. MONEY REQUIRING ACTION
    const [trainers, staffMembers] = await Promise.all([
      Trainer.find({ gymOwner: req.gymOwnerId, status: 'active' }),
      Staff.find({ gymOwner: req.gymOwnerId, status: 'active' })
    ]);

    // Check if salaries for current month are already recorded
    const currentMonthExpenses = await Expense.find({
      gymOwner: req.gymOwnerId,
      category: 'Salary',
      date: { $gte: currentMonthStart }
    });

    let upcomingSalaryObligations = 0;
    
    trainers.forEach(t => {
      const isPaid = currentMonthExpenses.some(exp => 
        exp.title.toLowerCase().includes(t.name.toLowerCase()) || 
        exp.title.toLowerCase().includes('trainer')
      );
      if (!isPaid) {
        upcomingSalaryObligations += t.salary || 0;
      }
    });

    staffMembers.forEach(s => {
      const isPaid = currentMonthExpenses.some(exp => 
        exp.title.toLowerCase().includes(s.name.toLowerCase()) || 
        exp.title.toLowerCase().includes('staff')
      );
      if (!isPaid) {
        upcomingSalaryObligations += s.salary || 0;
      }
    });

    // 6. RECENT PAYMENT ACTIVITY (Limit 20)
    const recentPayments = await Payment.find({ gymOwner: req.gymOwnerId, status: 'paid' })
      .populate('member', 'name phone')
      .sort({ paymentDate: -1 })
      .limit(20);

    const recentExpenses = await Expense.find({ gymOwner: req.gymOwnerId })
      .sort({ date: -1 })
      .limit(20);

    const combinedActivity = [
      ...recentPayments.map(p => {
        const planName = (p.plan || '').toLowerCase();
        const isPT = planName.includes('pt') || planName.includes('personal') || (p.notes || '').toLowerCase().includes('pt');
        return {
          id: p._id,
          name: p.member?.name || 'Unknown Member',
          transactionType: isPT ? 'PT Payment' : 'Membership Payment',
          amount: p.amount,
          date: p.paymentDate,
          status: 'paid',
          method: p.paymentMethod
        };
      }),
      ...recentExpenses.map(e => {
        let txType = 'Expense';
        if (e.category === 'Salary') {
          txType = e.title.toLowerCase().includes('trainer') ? 'Trainer Salary' : 'Staff Salary';
        }
        return {
          id: e._id,
          name: e.title,
          transactionType: txType,
          amount: e.amount,
          date: e.date,
          status: 'paid',
          method: e.paymentMethod
        };
      })
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    // Response packet
    res.status(200).json({
      success: true,
      data: {
        collectionsSummary: {
          totalCollected,
          collectedThisWeek,
          percentageChange
        },
        pendingCollections: {
          totalPendingAmount: pendingAmount,
          membersWithPendingPayments: pendingMembersCount,
          overdueMembers: overdueMembersCount
        },
        renewalPipeline: {
          expectedRenewalValue,
          totalRenewalsDue,
          renewalsDueWithinNext7Days: renewalsDue7Days
        },
        outgoingPayments: {
          totalOutgoingThisMonth,
          salaryExpenses,
          otherExpenses
        },
        moneyRequiringAction: {
          pendingCollectionAmount: pendingAmount,
          expectedRenewalAmount: expectedRenewalValue,
          upcomingSalaryObligations
        },
        revenueBreakdown: {
          membershipRevenue: membershipCollected,
          ptRevenue: ptCollected,
          otherIncome: otherIncomeCollected,
          totalRevenue: totalCollected
        },
        recentActivity: combinedActivity,
        pendingRecoveryList,
        renewalDueList
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, gymOwner: req.gymOwnerId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const memberId = payment.member;
    await Payment.updateOne({ _id: req.params.id }, { status: 'cancelled' });

    // Find the latest remaining paid payment for this member
    const latestRemainingPayment = await Payment.findOne({
      member: memberId,
      gymOwner: req.gymOwnerId,
      status: 'paid'
    }).sort({ paymentDate: -1 });

    const cancelledIsPt = payment.isPtPayment || 
                          (payment.plan && (payment.plan.toLowerCase().includes('pt') || payment.plan.toLowerCase().includes('personal'))) ||
                          (payment.notes && (payment.notes.toLowerCase().includes('pt') || payment.notes.toLowerCase().includes('personal')));

    const member = await Member.findOne({ _id: memberId, gymOwner: req.gymOwnerId });
    if (member) {
      const latestPlanName = latestRemainingPayment ? latestRemainingPayment.plan : '';
      const newPlanHasPt = latestPlanName.toLowerCase().includes('pt') || 
                           latestPlanName.toLowerCase().includes('personal') || 
                           (latestRemainingPayment && latestRemainingPayment.isPtPayment);

      const shouldUnassignPt = !latestRemainingPayment || !newPlanHasPt || cancelledIsPt;

      if (latestRemainingPayment) {
        const newExpiry = latestRemainingPayment.newExpiry;
        
        const updateFields = {
          plan: latestRemainingPayment.plan,
          planAmount: latestRemainingPayment.amount,
          planExpiry: newExpiry,
          status: member.status
        };
        if (shouldUnassignPt) {
          updateFields.assignedTrainer = null;
        }

        await Member.findOneAndUpdate(
          { _id: memberId },
          updateFields
        );
      } else {
        // No remaining payments: reset plan/expiry to defaults
        const updateFields = {
          planExpiry: member.joinDate || new Date(),
          status: member.status
        };
        if (shouldUnassignPt) {
          updateFields.assignedTrainer = null;
        }

        await Member.findOneAndUpdate(
          { _id: memberId },
          updateFields
        );
      }
    }

    res.status(200).json({ success: true, message: 'Payment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Razorpay Integration ---
const Razorpay = require('razorpay');
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_GoJimTestKey123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'GoJimTestSecret456';
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayInstance;
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_GoJimTestKey123';
    // Fallback to mock order if default dummy keys are used
    if (keyId === 'rzp_test_GoJimTestKey123') {
      console.log('⚠️ [Razorpay] Dummy credentials detected. Using mock order for testing.');
      const mockOrder = {
        id: `mock_order_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
        status: 'created',
        isMock: true
      };
      return res.status(200).json({ success: true, order: mockOrder });
    }

    const rzp = getRazorpayInstance();
    const options = {
      amount: Math.round(Number(amount) * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await rzp.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('❌ [Razorpay Order Error]:', error);
    if (process.env.NODE_ENV === 'development' || (error.statusCode === 401 || error.description === 'Authentication failed')) {
      console.warn('⚠️ [Razorpay API Failed] Falling back to mock order for development.');
      const mockOrder = {
        id: `mock_order_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
        status: 'created',
        isMock: true
      };
      return res.status(200).json({ success: true, order: mockOrder });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      memberId,
      amount,
      plan,
      notes,
      newExpiry: customExpiry,
      isPtPayment
    } = req.body;

    const crypto = require('crypto');
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'GoJimTestSecret456';

    const isMock = razorpay_order_id && razorpay_order_id.startsWith('mock_order_');
    if (!isMock) {
      // Verify signature
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
      }
    }

    // signature verified successfully! Now create the payment in database
    const now = new Date();
    const member = await Member.findOne({ _id: memberId, gymOwner: req.gymOwnerId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    let anchorDate = now;
    if (req.body.payFromCurrentDate) {
      anchorDate = now;
    } else if (member.status !== 'exited' && member.status !== 'inactive' && member.planExpiry) {
      anchorDate = member.planExpiry;
    }
    
    const newExpiry = customExpiry ? new Date(customExpiry) : await calculateExpiry(anchorDate, plan, req.gymOwnerId);
    const calculatedIsPtPayment = isPtPayment || (notes && (notes.toLowerCase().includes('pt') || notes.toLowerCase().includes('personal'))) || false;

    // Create the payment record with 'razorpay' method
    const payment = await Payment.create({
      member: memberId,
      amount,
      plan,
      paymentMethod: 'razorpay',
      newExpiry,
      notes: notes ? `${notes} (Razorpay ID: ${razorpay_payment_id})` : `Razorpay ID: ${razorpay_payment_id}`,
      receivedBy: req.user.id,
      gymOwner: req.gymOwnerId,
      isPtPayment: calculatedIsPtPayment,
      status: 'paid'
    });

    const updatedStatus = newExpiry > now ? 'active' : 'expired';

    await Member.findOneAndUpdate({ _id: memberId, gymOwner: req.gymOwnerId }, {
      plan, planAmount: amount, planExpiry: newExpiry, status: updatedStatus, lastAttendance: new Date()
    });

    // Log member razorpay payment
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'Payment Received',
      performedBy: req.user.name,
      affectedEntity: req.user.gymName,
      gymOwner: req.gymOwnerId,
      details: `Verified Razorpay payment of INR ${amount} from member ${member.name} for plan: ${plan} (Expiry: ${newExpiry.toLocaleDateString()}). Payment ID: ${razorpay_payment_id}`
    });

    res.status(200).json({ success: true, data: payment, newExpiry });
  } catch (error) {
    console.error('❌ [Razorpay Verification Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
