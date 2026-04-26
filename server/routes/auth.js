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
        OR: [
          { username: { equals: searchId } },
          { email: { equals: searchId } }
        ]
      },
      select: { role: true }
    });
    if (superadmin) {
      return res.json({ schools: [], count: 0, globalAccess: true, message: 'Global admin detected' });
    }

    // If no schoolSlug, do a global user lookup and return their school
    if (!schoolSlug) {
      const globalUser = await prisma.user.findFirst({
        where: { 
          OR: [
            { username: { equals: searchId } }, 
            { email: { equals: searchId } }
          ] 
        },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
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

    // Performance Optimization: Check User table FIRST using unique index
    // This handles 90% of logins (admins, teachers with usernames, students with admission numbers as username)
    const directUser = await prisma.user.findUnique({
      where: {
        schoolId_username: {
          schoolId,
          username: searchId
        }
      },
      select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
    });

    if (directUser?.school) {
      return res.json({ schools: [directUser.school], count: 1 });
    }

    // Secondary lookups for email or non-synced admission/staff IDs
    // SMART ROUTING: Reduce search width based on identifier pattern
    let finalMatch = null;
    const isEmail = searchId.includes('@');
    
    if (isEmail) {
      finalMatch = await prisma.user.findFirst({
        where: { schoolId, email: { equals: searchId } },
        select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
      });
    } else {
      const [studentMatch, teacherMatch] = await Promise.all([
        prisma.student.findFirst({
          where: { schoolId, admissionNumber: { equals: searchId } },
          select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
        }),
        prisma.teacher.findFirst({
          where: { schoolId, staffId: { equals: searchId } },
          select: { school: { select: { id: true, name: true, slug: true, logoUrl: true } } }
        })
      ]);
      finalMatch = studentMatch || teacherMatch;
    }

    if (!finalMatch?.school) {
      return res.status(404).json({ error: 'Account not found. Check your credentials.' });
    }

    res.json({ schools: [finalMatch.school], count: 1 });
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

      // FAST PATH: Try unique username lookup first
      user = await prisma.user.findUnique({
        where: {
          schoolId_username: {
            schoolId: school.id,
            username: searchId
          }
        },
        select: userSelect
      });

      // SLOW PATH: If not found by username, check conditionally based on format
      if (!user) {
        const isEmail = searchId.includes('@');
        
        if (isEmail) {
          user = await prisma.user.findFirst({
            where: { schoolId: school.id, email: { equals: searchId } },
            select: userSelect
          });
        } else {
          // Look up student or teacher by their ID numbers
          const [studentRecord, teacherRecord] = await Promise.all([
            prisma.student.findUnique({
              where: {
                schoolId_admissionNumber: {
                  schoolId: school.id,
                  admissionNumber: searchId
                }
              },
              select: { userId: true, user: { select: userSelect } }
            }),
            prisma.teacher.findUnique({
              where: {
                schoolId_staffId: {
                  schoolId: school.id,
                  staffId: searchId
                }
              },
              select: { userId: true, user: { select: userSelect } }
            })
          ]);

          // Get user from linked record
          user = studentRecord?.user || teacherRecord?.user;

          // If student/teacher found but userId is null (not linked to a User account yet),
          // return a specific error to avoid the misleading "Invalid credentials" message
          if (!user && (studentRecord || teacherRecord)) {
            console.error('[Auth] Login failed: Student/Teacher found but has no linked User account. admissionNumber/staffId:', searchId);
            return res.status(401).json({ 
              error: 'Your account has not been fully set up yet. Please contact your school administrator to activate your portal access.' 
            });
          }
        }
      }
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    if (user.schoolId && user.school && user.school.isActivated === false && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Your school account has been deactivated. Please contact your school administrator or platform support.' });
    }

    // Compare password — handle both bcrypt hashes and plain-text defaults
    let isMatch = false;
    const isBcryptHash = user.passwordHash && (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'));
    
    if (isBcryptHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Plain-text password (schema default or legacy). Compare directly.
      isMatch = (password === user.passwordHash);
      if (isMatch) {
        // Immediately upgrade to a proper bcrypt hash on first successful login
        try {
          const upgradedHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: upgradedHash }
          });
          console.log(`[Auth] Upgraded plain-text password to bcrypt hash for user ${user.username}`);
        } catch (upgradeErr) {
          console.error('[Auth] Failed to upgrade plain-text password hash:', upgradeErr);
        }
      }
    }
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
          id: true, admissionNumber: true, photoUrl: true, classId: true,
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
      include.parentChildren = { 
        select: { 
          id: true, name: true, admissionNumber: true, photoUrl: true,
          classModel: { select: { name: true } } 
        } 
      };
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

    // Perform essential lookups in parallel for the /me response
    const [unreadCount, formMasterClass, hasQuranAccess] = await Promise.all([
      // Unread message count
      prisma.parentTeacherMessage.count({
        where: { receiverId: req.user.id, isRead: false, schoolId: req.schoolId }
      }),
      // Form Master check
      role === 'teacher' ? prisma.class.findFirst({
        where: { classTeacherId: req.user.id, schoolId: req.schoolId },
        select: { id: true, name: true }
      }) : null,
      // Quran access check — lightweight: use findFirst to short-circuit instead of loading all records
      (async () => {
        if (role === 'admin' || role === 'principal' || role === 'superadmin') return true;
        
        const studentClassId = user?.student?.classId || user?.student?.classModel?.id;
        
        if (role === 'teacher') {
          // Find ANY single Quran-related assignment — stops at first match
          const quranAssignment = await prisma.teacherAssignment.findFirst({
            where: {
              teacherId: req.user.id,
              schoolId: req.schoolId,
              subject: {
                name: { contains: 'quran' }
              }
            },
            select: { id: true }
          });
          return !!quranAssignment;
        }
        
        if (role === 'student' && studentClassId) {
          const quranSubject = await prisma.classSubject.findFirst({
            where: {
              classId: studentClassId,
              schoolId: req.schoolId,
              subject: {
                name: { contains: 'quran' }
              }
            },
            select: { id: true }
          });
          return !!quranSubject;
        }
        return false;
      })()
    ]);

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
      photoUrl: user.photoUrl,
      unreadMessageCount: unreadCount,
      isFormMaster: !!formMasterClass,
      formMasterClass: formMasterClass,
      hasQuranAccess: hasQuranAccess
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
