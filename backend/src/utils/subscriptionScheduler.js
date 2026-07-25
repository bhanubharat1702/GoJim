const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const checkAndRenewOwnerSubscriptions = async () => {
  console.log(` [Subscription Scheduler] Checking for expired owner subscriptions...`);
  try {
    const today = new Date();
    // Find owners whose subscription has expired (both Active paid and Trial subscriptions)
    const expiredOwners = await User.find({
      role: 'owner',
      subscriptionStatus: { $in: ['Active', 'Trial'] },
      subscriptionEnd: { $lte: today }
    });

    if (expiredOwners.length > 0) {
      console.log(` [Subscription Scheduler] Found ${expiredOwners.length} expired subscription(s). Setting status to Expired.`);
      for (const owner of expiredOwners) {
        try {
          const previousStatus = owner.subscriptionStatus;
          owner.subscriptionStatus = 'Expired';
          await owner.save();

          // Create Audit Log entry for the owner
          const AuditLog = require('../models/AuditLog');
          await AuditLog.create({
            action: 'Subscription Expired',
            performedBy: 'System Scheduler',
            affectedEntity: owner.gymName || 'System Kernel',
            gymOwner: owner._id,
            details: `Subscription expired automatically. Previous status: ${previousStatus}. Gym owner must complete payment to activate.`
          });

          console.log(` [Subscription Scheduler] Marked owner "${owner.gymName || owner.name}" as Expired.`);
        } catch (ownerErr) {
          console.error(` [Subscription Scheduler] Failed to expire subscription for owner ${owner._id}:`, ownerErr.message);
        }
      }
    } else {
      console.log(`ℹ [Subscription Scheduler] No expired owner subscriptions found.`);
    }

    // Enforce payment check: owners in 'Active' state must have at least one subscription payment log
    const activeOwners = await User.find({
      role: 'owner',
      subscriptionStatus: 'Active'
    });

    for (const owner of activeOwners) {
      try {
        const AuditLog = require('../models/AuditLog');
        const hasPayment = await AuditLog.exists({
          $or: [
            { gymOwner: owner._id, action: 'Subscription Payment' },
            { affectedEntity: owner.gymName, action: 'Subscription Payment' }
          ]
        });

        if (!hasPayment) {
          console.log(`⚠️ [Subscription Scheduler] Active owner "${owner.gymName || owner.name}" has no payments recorded. Expired state enforced.`);
          owner.subscriptionStatus = 'Expired';
          await owner.save();

          await AuditLog.create({
            action: 'Subscription Expired',
            performedBy: 'System Scheduler',
            affectedEntity: owner.gymName || 'System Kernel',
            gymOwner: owner._id,
            details: `Enforced subscription expiration because no payment history was found for this active account.`
          });
        }
      } catch (ownerErr) {
        console.error(` [Subscription Scheduler] Failed to enforce payment check for active owner ${owner._id}:`, ownerErr.message);
      }
    }
  } catch (err) {
    console.error(' [Subscription Scheduler] Global check failed:', err.message);
  }
};

const startSubscriptionScheduler = () => {
  // Check 5 seconds after startup
  setTimeout(() => {
    checkAndRenewOwnerSubscriptions();
  }, 5000);

  // Check every 30 seconds for quick testing/simulation in development
  const CHECK_INTERVAL = 30 * 1000; // 30 seconds
  setInterval(() => {
    checkAndRenewOwnerSubscriptions();
  }, CHECK_INTERVAL);

  console.log('⏰ [Subscription Scheduler] Background auto-payment scheduler started (checking every 30s).');
};

module.exports = {
  startSubscriptionScheduler,
  checkAndRenewOwnerSubscriptions
};
