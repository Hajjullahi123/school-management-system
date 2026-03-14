const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

// Identify school based on username/email/admissionNumber
router.post('/identify', async (req, res) => {
  try {
    let { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Username or Email is required' });
    }

    console.log(`[AUTH DEBUG] Identification attempt for: [${identifier}]`);
    const fs = require('fs');
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    fs.appendFileSync('logs/auth-debug.log', `[${new Date().toISOString()}] IDENTIFY ATTEMPT: [${identifier}]\n`);

    identifier = identifier.trim();

    // 1. Search by Username (Standard & Case-Insensitive)
    const usersByUsername = await prisma.user.findMany({
      where: {
        OR: [
          { username: identifier },
          { username: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      include: { school: true }
    });

    // 2. Search by Email
    const usersByEmail = await prisma.user.findMany({
      where: {
        OR: [
          { email: identifier },
          { email: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      include: { school: true }
    });

    // 3. Search by Admission Number
    const studentsByAdmission = await prisma.student.findMany({
      where: {
        OR: [
          { admissionNumber: identifier },
          { admissionNumber: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      include: { school: true }
    });

    console.log(`[AUTH DEBUG] Found: ${usersByUsername.length} usernames, ${usersByEmail.length} emails, ${studentsByAdmission.length} admission#`);

    // Collect distinct schools found
    const schoolsMap = new Map();

    usersByUsername.forEach(u => {
      if (u.school) schoolsMap.set(u.school.id, u.school);
    });

    usersByEmail.forEach(u => {
      if (u.school) schoolsMap.set(u.school.id, u.school);
    });

    studentsByAdmission.forEach(s => {
      if (s.school) schoolsMap.set(s.school.id, s.school);
    });

    // Check if any user has global access (superadmin with null schoolId)
    const globalUsers = [...usersByUsername, ...usersByEmail].filter(u => !u.schoolId && u.role === 'superadmin');

    if (globalUsers.length > 0) {
      return res.json({
        schools: [],
        count: 0,
        globalAccess: true,
        message: 'Global administrator account detected'
      });
    }

    const matchedSchools = Array.from(schoolsMap.values()).map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logoUrl
    }));

    if (matchedSchools.length === 0) {
      return res.status(404).json({ error: 'We couldn\'t find an account with that information. Please check and try again.' });
    }

    res.json({
      schools: matchedSchools,
      count: matchedSchools.length
    });
  } catch (error) {
    console.error('Identify error:', error);
    const fs = require('fs');
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    fs.appendFileSync('logs/auth-debug.log', `[${new Date().toISOString()}] IDENTIFY ERROR: ${error.message}\n`);
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

    console.log(`[AUTH DEBUG] Login attempt: user=[${username}], school=[${schoolSlug || 'GLOBAL'}]`);

    let user;
    if (!schoolSlug) {
      // Global login (superadmin)
      user = await prisma.user.findFirst({
        where: {
          username: { equals: username, mode: 'insensitive' },
          schoolId: null,
          role: 'superadmin'
        },
        include: { school: true }
      });
    } else {
      // School-specific login
      const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
      if (!school) return res.status(404).json({ error: 'Invalid school domain' });

      user = await prisma.user.findFirst({
        where: {
          username: { equals: username, mode: 'insensitive' },
          schoolId: school.id
        },
        include: { school: true }
      });

      // Special case: check student record if user not found (login by admission number)
      if (!user) {
        const student = await prisma.student.findFirst({
          where: {
            admissionNumber: { equals: username, mode: 'insensitive' },
            schoolId: school.id
          },
          include: { user: { include: { school: true } } }
        });
        if (student) user = student.user;
      }
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
        schoolSlug: user.school?.slug
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current user data
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { school: true }
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
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
