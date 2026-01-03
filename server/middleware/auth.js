const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'darul-quran-secret-key-change-in-production';

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    // Check token in: cookies, authorization header, OR query params (for file uploads)
    const token = req.headers.authorization?.split(' ')[1] ||
      req.cookies.token ||
      req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.schoolId = decoded.schoolId; // Attach schoolId directly to req
    next();
  } catch (error) {
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
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  JWT_SECRET
};
