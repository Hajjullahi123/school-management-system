const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

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
    // Recommendation: Create indexes on [User.username], [User.email], [Student.admissionNumber], [Teacher.staffId]
    const [users, students, teachers] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            {
              ...schoolFilter,
              OR: [
                { username: { equals: searchId } },
                { email: { equals: searchId } }
              ]
            },
            {
              schoolId: null,
              role: 'superadmin',
              OR: [
                { username: { equals: searchId } },
                { email: { equals: searchId } }
              ]
            }
          ]
        },
        select: { 
          school: {
            select: { id: true, name: true, slug: true, logoUrl: true }
          },
          role: true,
          schoolId: true
        }
      }),
      prisma.student.findMany({
        where: { 
          ...schoolFilter,
          admissionNumber: { equals: searchId } 
        },
        select: {
          school: {
            select: { id: true, name: true, slug: true, logoUrl: true }
          }
        }
      }),
      prisma.teacher.findMany({
        where: { 
          ...schoolFilter,
          staffId: { equals: searchId } 
        },
        select: {
          school: {
            select: { id: true, name: true, slug: true, logoUrl: true }
          }
        }
      })
    ]);

    // Check for superadmin (global access)
    const hasGlobalAccess = users.some(u => !u.schoolId && u.role === 'superadmin');
    if (hasGlobalAccess) {
      return res.json({
        schools: [],
        count: 0,
        globalAccess: true,
        message: 'Global administrator account detected'
      });
    }

    // Collect distinct schools
    const schoolsMap = new Map();
    users.forEach(u => {
      if (u.school) schoolsMap.set(u.school.id, u.school);
    });
    students.forEach(s => {
      if (s.school) schoolsMap.set(s.school.id, s.school);
    });
    teachers.forEach(t => {
      if (t.school) schoolsMap.set(t.school.id, t.school);
    });

    const matchedSchools = Array.from(schoolsMap.values());

    if (matchedSchools.length === 0) {
      return res.status(404).json({ error: 'Account not found. Please check your credentials.' });
    }

    res.json({
      schools: matchedSchools,
      count: matchedSchools.length
    });
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
        schoolMotto: user.school?.motto,
        signatureUrl: user.signatureUrl,
        mustChangePassword: user.mustChangePassword,
        teacher: user.teacher,
        student: user.student,
        classesAsTeacher: user.classesAsTeacher,
        photoUrl: user.photoUrl
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

module.exports = router;
