const prisma = require('../db');

// Memory cache for school subscription status
const subscriptionCache = new Map();
const SUBSCRIPTION_CACHE_TTL = 120000; // 2 minutes

/**
 * Middleware to check if a school has an active subscription.
 * Blocks access to all protected features if the subscription has expired.
 */
const checkSubscription = async (req, res, next) => {
  if (!req.schoolId) return next();

  // SuperAdmins are exempt from subscription checks (central platform)
  if (req.user?.role === 'superadmin') return next();

  try {
    const now = Date.now();
    const cached = subscriptionCache.get(req.schoolId);

    // Use cache if available and not expired
    if (cached && (now - cached.timestamp < SUBSCRIPTION_CACHE_TTL)) {
      if (!cached.isActivated) {
        return res.status(403).json({
          error: 'SUBSCRIPTION_REQUIRED',
          message: 'This school portal has not been activated. Please contact support or purchase a license.'
        });
      }
      if (cached.isExpired) {
        return res.status(403).json({
          error: 'SUBSCRIPTION_EXPIRED',
          message: 'Your system subscription has expired. Please renew to restore access.'
        });
      }
      if (!cached.subscriptionActive) {
        return res.status(403).json({
          error: 'SUBSCRIPTION_INACTIVE',
          message: 'Access to this system has been suspended. Please contact the platform administrator.'
        });
      }
      return next();
    }

    // Cache miss: hit database
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { isActivated: true, expiresAt: true, subscriptionActive: true }
    });

    if (!school) {
      return res.status(404).json({ error: 'School entity not found' });
    }

    const isExpired = school.expiresAt && new Date(school.expiresAt) < new Date();
    
    // Auto-update DB if expired (still hits DB but only on expiry)
    if (isExpired && school.subscriptionActive) {
      await prisma.school.update({
        where: { id: req.schoolId },
        data: { subscriptionActive: false }
      }).catch(e => console.warn('[Subscription] Failed to auto-deactivate expired school:', e.message));
    }

    // Update Cache
    subscriptionCache.set(req.schoolId, {
      isActivated: school.isActivated,
      subscriptionActive: isExpired ? false : school.subscriptionActive,
      isExpired: isExpired,
      timestamp: now
    });

    // Handle responses
    if (!school.isActivated) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'This school portal has not been activated. Please contact support or purchase a license.'
      });
    }

    if (isExpired) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your system subscription has expired. Please renew to restore access.'
      });
    }

    if (!school.subscriptionActive) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_INACTIVE',
        message: 'Access to this system has been suspended. Please contact the platform administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next(); // Fail-safe
  }
};

/**
 * Higher Order Guard to check if a school has a specific package level.
 * Use for feature-gating (e.g. CBT, AI Analytics).
 */
const requirePackage = (requiredLevel) => {
  const levels = ['basic', 'standard', 'premium'];
  const requiredRank = levels.indexOf(requiredLevel);

  return async (req, res, next) => {
    if (!req.schoolId) return next();
    if (req.user?.role === 'superadmin') return next();

    try {
      const school = await prisma.school.findUnique({
        where: { id: req.schoolId },
        select: { packageType: true }
      });

      const currentRank = levels.indexOf(school.packageType || 'basic');

      if (currentRank < requiredRank) {
        return res.status(403).json({
          error: 'UPGRADE_REQUIRED',
          requiredPackage: requiredLevel,
          message: `The ${requiredLevel} plan is required to access this premium feature.`
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
};

module.exports = {
  checkSubscription,
  requirePackage
};
