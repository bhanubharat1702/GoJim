const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Single active session enforcement: check if user logged in on another device
    if (decoded.sessionId && req.user.activeSessionId && decoded.sessionId !== req.user.activeSessionId && !decoded.isImpersonated) {
      return res.status(401).json({
        success: false,
        sessionExpired: true,
        message: 'Your account was logged in on another device'
      });
    }

    // Set gymOwnerId for multi-tenancy
    // If owner, gymOwnerId is their own ID. If staff/trainer, it's their parent owner's ID.
    req.gymOwnerId = req.user.role === 'owner' ? req.user._id : req.user.gymOwner;

    // Check if session is impersonated by Super Admin
    req.isImpersonated = decoded.isImpersonated || false;

    // Check if the gym owner's account is currently being impersonated by Super Admin
    let isBeingImpersonated = false;
    if (req.user.role === 'owner') {
      isBeingImpersonated = req.user.isBeingImpersonated || false;
    } else if (req.user.gymOwner && req.user.role !== 'superadmin') {
      const owner = await User.findById(req.user.gymOwner);
      if (owner) {
        isBeingImpersonated = owner.isBeingImpersonated || false;
      }
    }

    // Block write operations if the account is being impersonated by Admin (except logout)
    const isLogoutRoute = req.path.includes('/logout');
    if (isBeingImpersonated && !req.isImpersonated && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !isLogoutRoute) {
      return res.status(403).json({
        success: false,
        message: 'Your account is being impersonated by the Admin. Please wait, we will remind you when the impersonate is done.'
      });
    }

    // Check if the user is suspended, trial completed, or subscription expired
    let isSuspended = false;
    let isTrialCompleted = false;
    let isPlanExpired = false;

    if (req.user.role === 'owner') {
      if (req.user.subscriptionStatus === 'Suspended' || !req.user.isActive) {
        isSuspended = true;
      }

      const now = new Date();
      if (req.user.subscriptionStatus === 'Expired') {
        isPlanExpired = true;
      } else if (req.user.subscriptionStatus === 'Trial') {
        let trialEnd = req.user.subscriptionTrialEnds ? new Date(req.user.subscriptionTrialEnds) : null;
        if (!trialEnd && req.user.createdAt) {
          trialEnd = new Date(new Date(req.user.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
        }
        if (trialEnd && trialEnd <= now) {
          isTrialCompleted = true;
        }
      } else {
        let end = req.user.subscriptionEnd ? new Date(req.user.subscriptionEnd) : null;
        if (!end && req.user.createdAt) {
          end = new Date(new Date(req.user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        if (end && end <= now) {
          isPlanExpired = true;
        }
      }
    } else if (req.user.gymOwner && req.user.role !== 'superadmin') {
      const owner = await User.findById(req.user.gymOwner);
      if (owner) {
        if (owner.subscriptionStatus === 'Suspended' || !owner.isActive) {
          isSuspended = true;
        }

        const now = new Date();
        if (owner.subscriptionStatus === 'Expired') {
          isPlanExpired = true;
        } else if (owner.subscriptionStatus === 'Trial') {
          let trialEnd = owner.subscriptionTrialEnds ? new Date(owner.subscriptionTrialEnds) : null;
          if (!trialEnd && owner.createdAt) {
            trialEnd = new Date(new Date(owner.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
          }
          if (trialEnd && trialEnd <= now) {
            isTrialCompleted = true;
          }
        } else {
          let end = owner.subscriptionEnd ? new Date(owner.subscriptionEnd) : null;
          if (!end && owner.createdAt) {
            end = new Date(new Date(owner.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
          }
          if (end && end <= now) {
            isPlanExpired = true;
          }
        }
      }
    }

    // Impersonated sessions by Super Admin are allowed to bypass the suspension block
    if (isSuspended && !req.isImpersonated) {
      const PlatformSettings = require('../models/PlatformSettings');
      const settings = await PlatformSettings.findOne({});
      const supportPhone = settings ? settings.supportPhone : '+1234567890';
      return res.status(401).json({
        success: false,
        message: `your account is suspended please contact support at ${supportPhone}`
      });
    }

    // Sync database status if expired
    if (isTrialCompleted || isPlanExpired) {
      try {
        if (req.user.role === 'owner') {
          if (req.user.subscriptionStatus !== 'Expired') {
            req.user.subscriptionStatus = 'Expired';
            await req.user.save();
          }
        } else if (req.user.gymOwner) {
          const User = require('../models/User');
          const owner = await User.findById(req.gymOwnerId);
          if (owner && owner.subscriptionStatus !== 'Expired') {
            owner.subscriptionStatus = 'Expired';
            await owner.save();
          }
        }
      } catch (err) {
        console.error('Failed to sync expired subscription status:', err);
      }
    }

    // Block access for trial-completed or plan-expired users, unless accessing me/logout/payment routes
    const isPaymentOrMeRoute = 
      req.path.startsWith('/me') || 
      req.path.includes('/razorpay') || 
      req.path.includes('/subscribe-plan') || 
      req.path.includes('/logout');

    if ((isTrialCompleted || isPlanExpired) && !isPaymentOrMeRoute && !req.isImpersonated) {
      return res.status(403).json({
        success: false,
        isLocked: true,
        message: isTrialCompleted 
          ? 'your trail completed please pay to restart the plan' 
          : 'please renevew your plan'
      });
    }

    // Check for maintenance mode
    const PlatformSettings = require('../models/PlatformSettings');
    const settings = await PlatformSettings.findOne({});
    if (settings && settings.maintenanceMode && req.user.role !== 'superadmin') {
      return res.status(401).json({
        success: false,
        message: 'system under maintainence please try after sometime'
      });
    }

    // Update last activity (throttled to once every 5 minutes to avoid DB spam)
    const now = new Date();
    if (!req.user.lastActivity || (now - req.user.lastActivity) > 5 * 60 * 1000) {
      req.user.lastActivity = now;
      await req.user.save();
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - invalid token'
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
