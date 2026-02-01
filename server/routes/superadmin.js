const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

/**
 * @route   GET /api/superadmin/stats
 * @desc    Get global system statistics and growth analysis
 * @access  SuperAdmin only
 */
router.get('/stats', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const [schoolCount, userCount, studentCount, teacherCount, auditCount] = await Promise.all([
      prisma.school.count(),
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.auditLog.count()
    ]);

    // Growth Analysis

    // 1. School with most active users
    const schoolActivity = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { users: true } }
      },
      orderBy: { users: { _count: 'desc' } },
      take: 5
    });

    // 2. Schools approaching student quota (>80% used)
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        maxStudents: true,
        _count: { select: { students: true } }
      }
    });

    const approachingQuota = schools
      .filter(s => s.maxStudents > 0 && (s._count.students / s.maxStudents) >= 0.8)
      .map(s => ({
        ...s,
        usage: ((s._count.students / s.maxStudents) * 100).toFixed(1)
      }))
      .sort((a, b) => b.usage - a.usage);

    // 3. Licenses expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await prisma.school.findMany({
      where: {
        isActivated: true,
        expiresAt: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      },
      select: { id: true, name: true, expiresAt: true }
    });

    res.json({
      schools: schoolCount,
      users: userCount,
      students: studentCount,
      teachers: teacherCount,
      audits: auditCount,
      growthInsights: {
        mostActive: schoolActivity,
        approachingQuota,
        expiringSoon
      }
    });
  } catch (error) {
    console.error('Superadmin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

/**
 * @route   POST /api/superadmin/impersonate/:schoolId
 * @desc    Log in as a school admin for troubleshooting
 * @access  SuperAdmin only
 */
router.post('/impersonate/:schoolId', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const { JWT_SECRET } = require('../middleware/auth');
    const jwt = require('jsonwebtoken');

    // Find ANY admin user for this school
    const adminUser = await prisma.user.findFirst({
      where: {
        schoolId,
        role: 'admin'
      },
      include: {
        school: true,
        student: true,
        teacher: true
      }
    });

    if (!adminUser) return res.status(404).json({ error: 'No admin user found for this school' });

    // Sign exactly like standard login
    const token = jwt.sign(
      {
        id: adminUser.id,
        schoolId: adminUser.schoolId,
        username: adminUser.username,
        role: adminUser.role,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie exactly like standard login
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      token,
      user: adminUser // Return the full user object to match what checkAuth expects
    });

    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'IMPERSONATE_ADMIN',
      resource: 'SCHOOL_USER',
      details: { schoolId, adminUserId: adminUser.id },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to impersonate admin' });
  }
});

/**
 * @route   GET /api/superadmin/schools
 * @desc    List all schools with basic info
 * @access  SuperAdmin only
 */
router.get('/schools', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true
          }
        },
        // 'license' is no longer a separate model, it's fields are on School directly
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(schools);
  } catch (error) {
    console.error('List schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Helper to generate a random 8-char password
const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

/**
 * @route   POST /api/superadmin/schools
 * @desc    Create a new school entry
 * @access  SuperAdmin only
 */
router.post('/schools', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const { name, slug, address, phone, email } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and Slug are required' });
    }

    // Check if slug exists
    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'School with this slug already exists' });
    }

    console.log(`[SuperAdmin] Creating school: ${name} (${slug})`);
    const tempPassword = generateRandomPassword();

    // Use a transaction to ensure both school and admin user are created
    const result = await prisma.$transaction(async (tx) => {
      const newSchool = await tx.school.create({
        data: {
          name,
          slug,
          address,
          phone,
          email
        }
      });

      // Create default admin user for this school
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const adminUser = await tx.user.create({
        data: {
          schoolId: newSchool.id,
          username: 'admin',
          passwordHash: hashedPassword,
          role: 'admin',
          firstName: 'School',
          lastName: 'Administrator',
          email: email || `admin@${slug}.com`,
          isActive: true
        }
      });

      return { school: newSchool, admin: adminUser };
    });

    const { school, admin } = result;
    console.log(`[SuperAdmin] School created with ID: ${school.id} and Admin user created`);

    res.status(201).json({
      school,
      credentials: {
        username: 'admin',
        password: tempPassword,
        schoolSlug: slug
      }
    });

    const { logAction } = require('../utils/audit');
    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'CREATE_SCHOOL',
      resource: 'SCHOOL',
      details: { schoolId: school.id, name: school.name, adminCreated: true },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

/**
 * @route   POST /api/superadmin/schools/:id/reset-admin
 * @desc    Reset the default admin password for a school
 * @access  SuperAdmin only
 */
router.post('/schools/:id/reset-admin', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const { manualPassword } = req.body;

    // Use manual password if provided, otherwise generate random one
    const tempPassword = manualPassword ? manualPassword.trim() : generateRandomPassword();

    if (manualPassword && manualPassword.length < 6) {
      return res.status(400).json({ error: 'Manual password must be at least 6 characters' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    // Find the first admin user for this school (regardless of username)
    const existingAdmin = await prisma.user.findFirst({
      where: {
        schoolId,
        role: 'admin'
      },
      orderBy: { createdAt: 'asc' }
    });

    let targetUsername = 'admin';

    if (existingAdmin) {
      targetUsername = existingAdmin.username;
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash: hashedPassword,
          isActive: true
        }
      });
    } else {
      // If no admin user exists, attempt to create one with 'admin' username
      // Check if 'admin' is already taken by a non-admin user
      const usernameConflict = await prisma.user.findUnique({
        where: {
          schoolId_username: {
            schoolId,
            username: 'admin'
          }
        }
      });

      if (usernameConflict) {
        // If 'admin' is taken, append a suffix
        targetUsername = `admin_${school.slug}`;
      }

      await prisma.user.create({
        data: {
          schoolId,
          username: targetUsername,
          passwordHash: hashedPassword,
          role: 'admin',
          firstName: 'School',
          lastName: 'Administrator',
          email: school.email || `admin@${school.slug}.com`,
          isActive: true
        }
      });
    }

    res.json({
      message: 'Admin credentials reset successfully',
      credentials: {
        username: targetUsername,
        password: tempPassword,
        schoolSlug: school.slug
      }
    });

    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'RESET_SCHOOL_ADMIN',
      resource: 'SCHOOL_USER',
      details: { schoolId, schoolName: school.name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Reset school admin error:', error);
    res.status(500).json({ error: 'Failed to reset admin credentials' });
  }
});

/**
 * @route   PUT /api/superadmin/schools/:id
 * @desc    Update school details (name, slug, address, phone, email)
 * @access  SuperAdmin only
 */
router.put('/schools/:id', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const { name, slug, address, phone, email } = req.body;

    if (slug) {
      const existing = await prisma.school.findFirst({
        where: {
          slug,
          NOT: { id: schoolId }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Another school already uses this slug' });
      }
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name,
        slug: slug?.toLowerCase().replace(/\s+/g, '-'),
        address,
        phone,
        email
      }
    });

    res.json({ message: 'School details updated successfully', school: updatedSchool });

    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'UPDATE_SCHOOL',
      resource: 'SCHOOL',
      details: { schoolId, updates: req.body },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school details' });
  }
});

/**
 * @route   DELETE /api/superadmin/schools/:id
 * @desc    Hard delete a school and ALL its data
 * @access  SuperAdmin only
 */
router.delete('/schools/:id', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);

    // This is a DESTRUCTIVE operation. In a real system, you might prefer Soft Delete.
    // For now, we will perform a cascade delete if Prisma is set up for it, 
    // or manual if not. 

    // Check if school exists
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    // Since many tables don't have cascade delete set up in Prisma by default 
    // unless explicitly stated in schema, we'll use a transaction for safety if possible
    // or just delete the school record if DB is set to Cascade.

    await prisma.school.delete({ where: { id: schoolId } });

    res.json({ message: 'School and all associated data deleted successfully' });

    console.log(`[SuperAdmin] School deleted: ${school.name} (ID: ${schoolId})`);
    logAction({
      schoolId: 1, // System level logs mapped to school 1 to avoid FK errors
      userId: req.user.id,
      action: 'DELETE_SCHOOL',
      resource: 'SCHOOL',
      details: { deletedSchoolId: schoolId, name: school.name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Failed to delete school. Check for foreign key constraints.' });
  }
});

/**
 * @route   POST /api/superadmin/schools/:id/toggle-activation
 * @desc    Activate or Deactivate a school's license access
 * @access  SuperAdmin only
 */
router.post('/schools/:id/toggle-activation', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { isActivated: !school.isActivated }
    });

    res.json({
      message: `School ${updatedSchool.isActivated ? 'activated' : 'deactivated'} successfully`,
      isActivated: updatedSchool.isActivated
    });

    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: updatedSchool.isActivated ? 'ACTIVATE_SCHOOL' : 'DEACTIVATE_SCHOOL',
      resource: 'SCHOOL',
      details: { schoolId, name: school.name },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Toggle school activation error:', error);
    res.status(500).json({ error: 'Failed to update school status' });
  }
});

/**
 * @route   GET /api/superadmin/audit
 * @desc    Global Audit Log View
 * @access  SuperAdmin only
 */
router.get('/audit', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          school: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.auditLog.count()
    ]);

    // Fetch user details manually
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, username: true, role: true }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedLogs = logs.map(log => ({
      ...log,
      user: log.userId ? userMap[log.userId] : null
    }));

    res.json({
      logs: enrichedLogs,
      total
    });
  } catch (error) {
    console.error('Global audit error:', error);
    res.status(500).json({ error: 'Failed to fetch global audit logs' });
  }
});

/**
 * @route   GET /api/superadmin/global-settings
 * @desc    Get global developer settings
 * @access  Public (for login page)
 */
router.get('/global-settings', async (req, res) => {
  try {
    let settings = await prisma.globalSettings.findFirst();
    if (!settings) {
      // Create default if not exists
      settings = await prisma.globalSettings.create({
        data: { id: 1 }
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Get global settings error:', error);
    res.status(500).json({ error: 'Failed to fetch global settings' });
  }
});

/**
 * @route   POST /api/superadmin/global-settings
 * @desc    Update global developer settings
 * @access  SuperAdmin only
 */
router.post('/global-settings', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const {
      facebookUrl, instagramUrl, whatsappUrl, websiteUrl,
      contactPhone, contactEmail,
      platformPaystackKey, platformFlutterwaveKey, platformSecretKey,
      basicPrice, standardPrice, premiumPrice,
      s3AccessKey, s3SecretKey, s3BucketName, s3Region, enableAutoBackup, backupRetentionDays
    } = req.body;

    const settings = await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: {
        facebookUrl,
        instagramUrl,
        whatsappUrl,
        websiteUrl,
        contactPhone,
        contactEmail,
        platformPaystackKey,
        platformFlutterwaveKey,
        platformSecretKey,
        basicPrice: parseFloat(basicPrice) || undefined,
        standardPrice: parseFloat(standardPrice) || undefined,
        premiumPrice: parseFloat(premiumPrice) || undefined,
        s3AccessKey,
        s3SecretKey,
        s3BucketName,
        s3Region,
        enableAutoBackup: enableAutoBackup === true || enableAutoBackup === 'true',
        backupRetentionDays: parseInt(backupRetentionDays) || undefined
      },
      create: {
        id: 1,
        facebookUrl,
        instagramUrl,
        whatsappUrl,
        websiteUrl,
        contactPhone,
        contactEmail,
        platformPaystackKey,
        platformFlutterwaveKey,
        platformSecretKey,
        basicPrice: parseFloat(basicPrice) || 50000,
        standardPrice: parseFloat(standardPrice) || 120000,
        premiumPrice: parseFloat(premiumPrice) || 250000,
        s3AccessKey,
        s3SecretKey,
        s3BucketName,
        s3Region,
        enableAutoBackup: enableAutoBackup === true || enableAutoBackup === 'true',
        backupRetentionDays: parseInt(backupRetentionDays) || 30
      }
    });

    res.json({ message: 'Global settings updated successfully', settings });

    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'UPDATE_GLOBAL_SETTINGS',
      resource: 'GLOBAL_SETTINGS',
      details: req.body,
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Update global settings error:', error);
    res.status(500).json({ error: 'Failed to update global settings' });
  }
});

module.exports = router;
