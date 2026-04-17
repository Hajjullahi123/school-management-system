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
    let { identifier, schoolSlug } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or Email is required' });
    }

    const searchId = identifier.trim();

    // PERFORMANCE OPTIMIZATION: If schoolSlug is provided (from URL), narrow the search
    // This reduces the search space from all schools to just one.
    let schoolFilter = {};
    if (schoolSlug && schoolSlug !== 'undefined' && schoolSlug !== 'null' && schoolSlug !== '') {
      const school = await prisma.school.findUnique({
        where: { slug: schoolSlug },
        select: { id: true }
      });
      if (school) {
        schoolFilter = { schoolId: school.id };
      }
    }

    // Perform lookups in parallel to save time
    // Selective fields to reduce DB load
    // Perform lookups sequentially but stop early if we find a unique match for school-slugged requests
    // or use optimized parallel lookups for global identification.
    
    const [users, students, teachers] = await Promise.all([
      prisma.user.findMany({
        where: {
          AND: [
             schoolFilter,
             { OR: [{ username: searchId }, { email: searchId }] }
          ]
        },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } }, role: true, schoolId: true }
      }),
      prisma.student.findMany({
        where: { ...schoolFilter, admissionNumber: searchId },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
      }),
      prisma.teacher.findMany({
        where: { ...schoolFilter, staffId: searchId },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
      })
    ]);
    
    // ALWAYS check for superadmin specifically to allow global access from any domain
    let finalUsers = [...users];
    
    const superadmins = await prisma.user.findMany({
      where: { 
        role: 'superadmin', 
        schoolId: null, 
        OR: [{ username: searchId }, { email: searchId }] 
      },
      select: { role: true, schoolId: true }
    });

    if (superadmins.length > 0) {
      // If we found a global admin, we return immediately with globalAccess flag
      return res.json({ schools: [], count: 0, globalAccess: true, message: 'Global admin detected' });
    }

    // Collect distinct schools efficiently
    const schoolsMap = new Map();
    [...finalUsers, ...students, ...teachers].forEach(entry => {
      if (entry && entry.school) {
        schoolsMap.set(entry.school.id, entry.school);
      }
    });

    const matchedSchools = Array.from(schoolsMap.values());
    if (matchedSchools.length === 0) {
      return res.status(404).json({ error: 'Account not found. Check your credentials.' });
    }

    // PERFORMANCE OPTIMIZATION: If we only found ONE school and we have a schoolSlug context,
    // we can return faster without the client needing to pick.
    
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

      // Fire all 3 lookups in parallel — username, admission number, staff ID
      const userInclude = {
        school: true,
        teacher: true,
        student: { include: { classModel: true } },
        classesAsTeacher: true
      };

      const [userByUsername, studentByAdmission, teacherByStaffId] = await Promise.all([
        // 1. Lookup by username
        prisma.user.findFirst({
          where: {
            username: { equals: searchId },
            schoolId: school.id
          },
          include: userInclude
        }),
        // 2. Lookup by admission number (students)
        prisma.student.findFirst({
          where: {
            admissionNumber: { equals: searchId },
            schoolId: school.id
          },
          select: { user: { include: userInclude } }
        }),
        // 3. Lookup by staff ID (teachers)
        prisma.teacher.findFirst({
          where: {
            staffId: { equals: searchId },
            schoolId: school.id
          },
          select: { user: { include: userInclude } }
        })
      ]);

      // Pick the first match found (username takes priority)
      user = userByUsername || studentByAdmission?.user || teacherByStaffId?.user || null;
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Performance Optimization: If the hash uses 12 rounds (slow in JS), re-hash to 10
    if (user.passwordHash.startsWith('$2a$12$') || user.passwordHash.startsWith('$2b$12$')) {
      try {
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash }
        });
        console.log(`[Auth] Migrated user ${user.username} to faster password hash (10 rounds)`);
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
        photoUrl: user.photoUrl
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
    const include = { school: true };
    const role = req.user.role;

    // Only include relevant data to speed up the query
    if (role === 'teacher') {
      include.teacher = true;
      include.classesAsTeacher = true;
    } else if (role === 'student') {
      include.student = { include: { classModel: true } };
    } else if (role === 'parent') {
      include.parent = true;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
