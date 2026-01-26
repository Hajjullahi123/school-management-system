const prisma = require('../db');

/**
 * Middleware to resolve schoolId based on the request domain.
 * This enables White-Label support.
 * Example: 'portal.kingscollege.com' -> maps to schoolId for Kings College.
 */
const resolveDomain = async (req, res, next) => {
  const host = req.get('host'); // e.g., 'portal.kingscollege.com'

  // Ignore local development hosts and platform's main domain (optional)
  const platformDomain = process.env.PLATFORM_DOMAIN || 'localhost';

  if (host.includes(platformDomain)) {
    // Standard path-based or slug-based resolution will handle this
    return next();
  }

  try {
    // Check if any school has this custom domain configured
    const school = await prisma.school.findUnique({
      where: { customDomain: host },
      select: { id: true, slug: true, isActivated: true }
    });

    if (school) {
      // Injected school info - this can be used by auth/controllers
      req.resolvedSchoolId = school.id;
      req.resolvedSlug = school.slug;

      // We can also set a flag that the request came via a custom domain
      req.viaCustomDomain = true;
    }

    next();
  } catch (error) {
    console.error('Domain resolution error:', error);
    next();
  }
};

module.exports = {
  resolveDomain
};
