const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    let { username, password, schoolSlug } = req.body;

    if (!username || !password || !schoolSlug) {
      return res.status(400).json({ error: 'Username, password, and school slug are required' });
    }

    username = username.trim();
    password = password.trim();
    schoolSlug = schoolSlug.trim().toLowerCase();
    const fs = require('fs');
    const logPath = 'C:\\Users\\IT-LAB\\School Mn\\server\\auth-debug.log';
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Login attempt - username: [${username}], schoolSlug: [${schoolSlug}], origin: ${req.headers.origin}\n`);

    if (schoolSlug === 'null' || schoolSlug === 'undefined') {
      return res.status(400).json({ error: 'Invalid school domain' });
    }

    // 1. Find school by slug
    const school = await prisma.school.findFirst({
      where: { slug: schoolSlug }
    });

    if (!school) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] School NOT FOUND for slug: [${schoolSlug}]\n`);
      console.log(`School not found for slug: [${schoolSlug}]`);
      return res.status(404).json({ error: `School domain '${schoolSlug}' not found` });
    }
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] School FOUND: ID: ${school.id}, Slug: ${school.slug}\n`);


    // 2. Find user by username OR admissionNumber (for students) OR email
    let user = await prisma.user.findUnique({
      where: {
        schoolId_username: {
          schoolId: school.id,
          username
        }
      },
      include: {
        student: true,
        teacher: true,
        school: true
      }
    });

    // Fallback: If not found by username, try searching by admissionNumber (for students)
    if (!user) {
      const studentProfile = await prisma.student.findFirst({
        where: {
          schoolId: school.id,
          admissionNumber: username
        },
        include: {
          user: {
            include: {
              student: true,
              teacher: true,
              school: true
            }
          }
        }
      });
      if (studentProfile) user = studentProfile.user;
    }

    // Fallback: Try searching by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: {
          schoolId_email: {
            schoolId: school.id,
            email: username
          }
        },
        include: {
          student: true,
          teacher: true,
          school: true
        }
      });
    }

    console.log(`Login attempt for: ${username}`);

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if school is activated (Exempt SuperAdmins)
    if (user.role !== 'superadmin' && !school.isActivated) {
      return res.status(403).json({ error: 'This school portal is currently deactivated. Please contact the system administrator.' });
    }

    if (!user.isActive) {
      console.log('Login failed: User inactive');
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log(`Password valid: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        schoolId: user.schoolId, // IMPORTANT
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user data (without password)
    res.json({
      user: {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        student: user.student,
        teacher: user.teacher,
        school: user.school,
        mustChangePassword: user.mustChangePassword
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        school: true,
        student: {
          include: {
            classModel: true
          }
        },
        teacher: true,
        parent: {
          include: {
            students: {
              include: {
                classModel: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Block access if school is deactivated (SuperAdmins always allowed)
    if (user.role !== 'superadmin' && !user.school?.isActivated) {
      return res.status(403).json({ error: 'This school portal is currently deactivated.' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false
      }
    });

    res.json({ message: 'Password changed successfully' });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CHANGE_PASSWORD',
      resource: 'USER_ACCOUNT',
      details: {
        userId: req.user.id
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: Reset user password
router.post('/reset-password', authenticate, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const trimmedPassword = newPassword.trim();

    // Only admins can reset passwords
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can reset passwords' });
    }

    if (!userId || !trimmedPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Check if user exists and belongs to the SAME school
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
        schoolId: req.schoolId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in your school' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 12);

    // Update password and set mustChangePassword flag
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: true // Force user to change password on next login
      }
    });

    res.json({
      message: 'Password reset successfully',
      username: user.username,
      temporaryPassword: trimmedPassword
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'RESET_USER_PASSWORD',
      resource: 'USER_ACCOUNT',
      details: {
        targetUserId: user.id,
        targetUsername: user.username
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
