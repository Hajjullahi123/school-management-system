const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Identify school based on username/email/admissionNumber
router.post('/identify', async (req, res) => {
  try {
    const { identifier, schoolSlug } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or Email is required' });
    }

    const searchId = identifier.trim();

    // Superadmin fast-path (no schoolSlug needed)
    const superadmin = await prisma.user.findFirst({
      where: {
        role: 'superadmin',
        schoolId: null,
        OR: [{ username: searchId }, { email: searchId }]
      },
      select: { role: true }
    });
    if (superadmin) {
      return res.json({ schools: [], count: 0, globalAccess: true, message: 'Global admin detected' });
    }

    // If no schoolSlug, do a global user lookup and return their school
    if (!schoolSlug) {
      const globalUser = await prisma.user.findFirst({
        where: { OR: [{ username: searchId }, { email: searchId }] },
        select: { school: { select: { id: true, name: true, slug: true } } }
      });
      if (globalUser?.school) {
        return res.json({ schools: [globalUser.school], count: 1 });
      }
      return res.status(404).json({ error: 'Account not found. Check your credentials.' });
    }

    // Cache school slug → id lookup
    const schoolCache = global.__schoolCache || (global.__schoolCache = {});
    let schoolId;
    if (schoolCache[schoolSlug]) {
      schoolId = schoolCache[schoolSlug];
    } else {
      const school = await prisma.school.findUnique({
        where: { slug: schoolSlug },
        select: { id: true }
      });
      if (!school) {
        return res.status(404).json({ error: 'Invalid school domain' });
      }
      schoolId = school.id;
      schoolCache[schoolSlug] = schoolId;
    }

    const schoolFilter = { schoolId };

    // Single fast lookup utilizing relational OR queries
    const userMatch = await prisma.user.findFirst({
      where: {
        schoolId,
        OR: [
          { username: searchId },
          { email: searchId },
          { student: { admissionNumber: searchId } },
          { teacher: { staffId: searchId } }
        ]
      },
      select: { school: { select: { id: true, name: true, slug: true } } }
    });

    // Collect distinct schools from the matches
    const schoolsMap = new Map();
    if (userMatch?.school) schoolsMap.set(userMatch.school.id, userMatch.school);
    const matchedSchools = Array.from(schoolsMap.values());
    if (matchedSchools.length === 0) {
      return res.status(404).json({ error: 'Account not found. Check your credentials.' });
    }
    res.json({ schools: matchedSchools, count: matchedSchools.length });
  } catch (error) {
    console.error('Identify error:', error);
    res.status(500).json({ error: 'Identification failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    let { username, password, schoolSlug } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const searchId = username.trim();

    let user;
    if (!schoolSlug) {
      // Global login (superadmin)
      user = await prisma.user.findFirst({
        where: {
          username: { equals: searchId },
          schoolId: null,
          role: 'superadmin'
        },
        include: { school: true }
      });
    } else {
      // School-specific login
      const school = await prisma.school.findUnique({ 
        where: { slug: schoolSlug },
        select: { id: true } 
      });
      if (!school) return res.status(404).json({ error: 'Invalid school domain' });

      // Minimal payload selection for faster queries
      const userSelect = {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        signatureUrl: true,
        mustChangePassword: true,
        photoUrl: true,
        isActive: true,
        departmentAsHead: { select: { id: true, name: true } },
        school: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            isActivated: true
          }
        }
      };

      // Unified single query for fast login resolution
      user = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { username: searchId },
            { student: { admissionNumber: searchId } },
            { teacher: { staffId: searchId } }
          ]
        },
        select: userSelect
      });
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    if (user.schoolId && user.school && user.school.isActivated === false && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Your school account has been deactivated. Please contact your school administrator or platform support.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Performance Optimization: If the hash uses 12 rounds (slow in JS), re-hash to 8 for speed
    if (user.passwordHash.startsWith('$2a$12$') || user.passwordHash.startsWith('$2b$12$') || 
        user.passwordHash.startsWith('$2a$10$') || user.passwordHash.startsWith('$2b$10$')) {
      try {
        const newHash = await bcrypt.hash(password, 8);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash }
        });
        console.log(`[Auth] Migrated user ${user.username} to faster password hash (8 rounds)`);
      } catch (err) {
        console.error('[Auth] Failed to migrate password hash:', err);
      }
    }

    // Generate JWT (Trimmed payload for speed)
    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        schoolSlug: user.school?.slug,
        schoolLogo: user.school?.logoUrl,
        schoolName: user.school?.name,
        signatureUrl: user.signatureUrl,
        mustChangePassword: user.mustChangePassword,
        photoUrl: user.photoUrl,
        departmentAsHead: user.departmentAsHead
      }
    });

    // Log login success here (Moved from /me for better performance)
    logAction({
      schoolId: user.schoolId || 1,
      userId: user.id,
      action: 'LOGIN',
      resource: 'USER',
      details: { username: user.username, role: user.role, method: 'credentials' },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', authenticate, (req, res) => {
  logAction({
    schoolId: req.schoolId || 1,
    userId: req.user.id,
    action: 'LOGOUT',
    resource: 'USER',
    details: { username: req.user.username },
    ipAddress: req.ip
  });
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user data
router.get('/me', authenticate, async (req, res) => {
  try {
    const role = req.user.role;

    // Build a minimal select to avoid loading heavy JSON columns (gradingSystem etc.)
    const schoolSelect = {
      id: true, slug: true, name: true, logoUrl: true,
      motto: true, isActivated: true, packageType: true
    };

    // Role-specific includes — only what's actually needed
    let include = { school: { select: schoolSelect } };
    if (role === 'teacher') {
      include.teacher = { select: { id: true, staffId: true, specialization: true, photoUrl: true } };
      include.classesAsTeacher = { select: { id: true, name: true, arm: true } };
    } else if (role === 'student') {
      include.student = {
        select: {
          id: true, admissionNumber: true, photoUrl: true,
          classModel: { 
            select: { 
              id: true, name: true, arm: true,
              classTeacher: {
                select: {
                  firstName: true,
                  lastName: true,
                  signatureUrl: true
                }
              }
            } 
          }
        }
      };
    } else if (role === 'parent') {
      include.parent = { select: { id: true, phone: true } };
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, username: true, role: true, schoolId: true,
        firstName: true, lastName: true, email: true,
        signatureUrl: true, mustChangePassword: true, photoUrl: true,
        departmentAsHead: { select: { id: true, name: true } },
        ...include
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.schoolId && user.school && user.school.isActivated === false && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Your school account has been deactivated. Please contact your administrator.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId,
      schoolSlug: user.school?.slug,
      schoolLogo: user.school?.logoUrl,
      schoolName: user.school?.name,
      schoolMotto: user.school?.motto,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      signatureUrl: user.signatureUrl,
      mustChangePassword: user.mustChangePassword,
      teacher: user.teacher,
      student: user.student,
      classesAsTeacher: user.classesAsTeacher,
      photoUrl: user.photoUrl
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change current user's password
 * @access  Private
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: newPasswordHash,
        mustChangePassword: false // Clear flag if it was set
      }
    });

    // Log the action
    logAction({
      schoolId: user.schoolId || 1,
      userId: user.id,
      action: 'UPDATE',
      resource: 'USER_PASSWORD',
      details: { username: user.username },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Admin reset user password
 * @access  Private (Admin/Principal only)
 */
router.post('/reset-password', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { 
        passwordHash,
        mustChangePassword: true // Force change on next login
      }
    });

    // Log the action
    logAction({
      schoolId: req.schoolId || (updatedUser.schoolId || 1),
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'USER_PASSWORD_RESET',
      details: { 
        targetUserId: updatedUser.id,
        targetUsername: updatedUser.username,
        resetBy: req.user.username 
      },
      ipAddress: req.ip
    });

    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      username: updatedUser.username,
      temporaryPassword: newPassword // Returning for the admin to show/print
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
