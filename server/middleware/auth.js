const jwt = require('jsonwebtoken');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
  process.exit(1);
}
const logFile = 'logs/auth-debug.log';

// Authentication middleware
const authenticate = (req, res, next) => {
  // Debug logging removed for performance in production

  try {
    // Check token in: cookies, authorization header, OR query params (for file uploads)
    const token = req.headers.authorization?.split(' ')[1] ||
      req.cookies.token ||
      req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.schoolId = decoded.schoolId ? parseInt(decoded.schoolId) : null;

      // DEMO PROTECTION: Prevent modifications by demo_admin
      if (decoded.username === 'demo_admin') {
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase());
        const isWhitelisted = ['/api/auth/logout', '/api/platform-billing/initialize-subscription'].some(path => req.path.startsWith(path));

        if (isWriteOperation && !isWhitelisted) {
          return res.status(403).json({
            error: 'Action restricted in Demo Mode',
            isDemoRestriction: true,
            message: 'To protect the shared demo environment, editing and deleting are disabled. Purchase a license to unlock full features!'
          });
        }
      }
    } catch (jwtError) {
      console.error(`[Auth] JWT Verification failed: ${jwtError.message}. Token starts with: ${token?.substring(0, 10)}`);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    next();
  } catch (error) {
    console.error(`[Auth] Fatal authentication error: ${error.message}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  // Flatten roles array in case it's passed as an array
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Superadmins always have access
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`Authorization failed. User ID: ${req.user.id}, Role: ${req.user.role}, Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.schoolId = decoded.schoolId ? parseInt(decoded.schoolId) : null;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};

// Section scope middleware for sub-admins
// Populates req.assignedSectionIds (section IDs) and req.allowedClassIds (class IDs in those sections)
// Only applies to sub_admin users who have section restrictions.
// If no sections are assigned, req.allowedClassIds remains undefined (= full access).
const attachSectionScope = async (req, res, next) => {
  try {
    if (req.user && req.user.id && req.user.role === 'sub_admin') {
      const prisma = require('../db');
      const sectionAssignments = await prisma.sectionAdminAccess.findMany({
        where: { userId: req.user.id },
        select: {
          sectionId: true,
          Section: { select: { id: true, name: true, code: true } }
        }
      });

      if (sectionAssignments && sectionAssignments.length > 0) {
        req.assignedSectionIds = sectionAssignments.map(a => a.sectionId);
        const sections = sectionAssignments.map(a => a.Section).filter(Boolean);

        // 1. Fetch classes explicitly assigned to these section IDs
        const linkedClasses = await prisma.class.findMany({
          where: {
            schoolId: req.schoolId,
            sectionId: { in: req.assignedSectionIds }
          },
          select: { id: true, name: true, sectionId: true }
        });

        // 2. For unlinked classes (sectionId: null), check name/code matching and backfill
        const nameConditions = [];
        for (const sec of sections) {
          const secName = sec.name.trim();
          if (secName.length >= 3) {
            nameConditions.push({ name: { startsWith: secName, mode: 'insensitive' } });
          }
          if (sec.code && sec.code.trim().length >= 2) {
            const secCode = sec.code.trim();
            nameConditions.push({ name: { startsWith: secCode, mode: 'insensitive' } });
          }
        }

        let unlinkedClasses = [];
        if (nameConditions.length > 0) {
          unlinkedClasses = await prisma.class.findMany({
            where: {
              schoolId: req.schoolId,
              sectionId: null,
              OR: nameConditions
            },
            select: { id: true, name: true, sectionId: true }
          });

          if (unlinkedClasses.length > 0) {
            for (const cls of unlinkedClasses) {
              const clsLower = cls.name.trim().toLowerCase();
              const matchedSec = sections.find(s => 
                (s.name && s.name.trim().length >= 3 && clsLower.startsWith(s.name.trim().toLowerCase())) ||
                (s.code && s.code.trim().length >= 2 && clsLower.startsWith(s.code.trim().toLowerCase()))
              );
              if (matchedSec) {
                prisma.class.update({
                  where: { id: cls.id },
                  data: { sectionId: matchedSec.id }
                }).catch(() => {});
              }
            }
          }
        }

        const allClasses = [...linkedClasses, ...unlinkedClasses];
        req.allowedClassIds  = allClasses.map(c => c.id);
        req.allowedClassNames = allClasses.map(c => c.name);
      }
    }
  } catch (err) {
    console.error('[SectionScope] Error attaching section scope:', err);
  }
  next();
};


module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  attachSectionScope,
  JWT_SECRET
};
