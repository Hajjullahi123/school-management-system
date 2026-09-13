// Simple memory cache for domain resolution
const prisma = require('../db');
const domainCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * Middleware to resolve schoolId based on the request domain.
 * This enables White-Label support.
 * Example: 'portal.kingscollege.com' -> maps to schoolId for Kings College.
 */
const resolveDomain = async (req, res, next) => {
  const rawHost = req.get('host'); // e.g., 'portal.kingscollege.com' or 'portal.kingscollege.com:443'

  // Normalize: lowercase and strip port number
  const host = rawHost ? rawHost.split(':')[0].toLowerCase().trim() : null;

  // Ignore local development hosts and platform's main domain
  const platformDomain = process.env.PLATFORM_DOMAIN || 'educatechportal.com';

  // Skip for standard library/asset paths or common file extensions
  if (!host || 
      host.includes(platformDomain) || 
      host.includes('onrender.com') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.startsWith('192.168.') ||
      req.path.startsWith('/api/public') ||
      req.path.startsWith('/api/auth') ||
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/) ||
      req.path === '/favicon.ico') {
    return next();
  }

  // Check Cache First
  const cached = domainCache.get(host);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    if (cached.school) {
        req.resolvedSchoolId = cached.school.id;
        req.resolvedSlug = cached.school.slug;
        req.viaCustomDomain = true;
    }
    return next();
  }

  try {
    // Check if any school has this custom domain configured (case-insensitive via lowercase normalization)
    const school = await prisma.school.findFirst({
      where: { customDomain: { equals: host, mode: 'insensitive' } },
      select: { id: true, slug: true, isActivated: true }
    });

    if (school) {
      console.log(`[DomainResolver] Resolved ${host} -> School ID: ${school.id}, Slug: ${school.slug}`);
      req.resolvedSchoolId = school.id;
      req.resolvedSlug = school.slug;
      req.viaCustomDomain = true;
    }

    // Cache the result even if null (to avoid re-querying non-custom domains)
    domainCache.set(host, { school, timestamp: Date.now() });
    next();
  } catch (error) {
    console.error('Domain resolution error:', error);
    next();
  }
};

module.exports = {
  resolveDomain
};
