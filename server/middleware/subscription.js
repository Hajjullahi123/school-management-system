const prisma = require('../db');

/**
 * Middleware to check if a school has an active subscription.
 * Blocks access to all protected features if the subscription has expired.
 */
const checkSubscription = async (req, res, next) => {
  if (!req.schoolId) return next();

  // SuperAdmins are exempt from subscription checks (central platform)
  if (req.user?.role === 'superadmin') return next();

  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { isActivated: true, expiresAt: true, subscriptionActive: true }
    });

    if (!school) {
      return res.status(404).json({ error: 'School entity not found' });
    }

    // Check activation
    if (!school.isActivated) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'This school portal has not been activated. Please contact support or purchase a license.'
      });
    }

    // Check expiry
    if (school.expiresAt && new Date(school.expiresAt) < new Date()) {
      // Automatically mark as inactive if expired
      if (school.subscriptionActive) {
        await prisma.school.update({
          where: { id: req.schoolId },
          data: { subscriptionActive: false }
        });
      }

      return res.status(403).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Your system subscription has expired. Please renew to restore access.'
      });
    }

    // Force inactive flag check
    if (!school.subscriptionActive) {
      return res.status(403).json({
        error: 'SUBSCRIPTION_INACTIVE',
        message: 'Access to this system has been suspended. Please contact the platform administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next(); // Fail-safe: allow access if DB check crashes, or block if preferred.
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
