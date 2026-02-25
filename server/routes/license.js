const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateLicenseKey, validateLicense, checkActivationStatus } = require('../utils/license');

// Get current license status for the authenticated school
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await checkActivationStatus(req.schoolId);
    res.json(status);
  } catch (error) {
    console.error('Error checking license status:', error);
    res.status(500).json({ error: 'Failed to check license status' });
  }
});

// Activate the current school with a license key
router.post('/activate', authenticate, authorize(['admin']), async (req, res) => {
  const { licenseKey, schoolName, schoolAddress, schoolPhone, schoolEmail } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  try {
    // 1. Validate the key (Stateless verification)
    const validation = await validateLicense(licenseKey);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const licenseData = validation.license;

    // 2. Update School record
    const updatedSchool = await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        licenseKey,
        isActivated: true,
        name: schoolName || licenseData.schoolName || undefined,
        address: schoolAddress || undefined,
        phone: schoolPhone || undefined,
        email: schoolEmail || undefined
      }
    });

    res.json({ success: true, message: 'School activated successfully', school: updatedSchool });

    // Log activation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'ACTIVATE_LICENSE',
      resource: 'LICENSE',
      details: {
        licenseKey,
        packageType: licenseData.packageType
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ error: 'Activation failed' });
  }
});

// Generate a new license for a school (SuperAdmin only)
router.post('/generate/:schoolId', authenticate, authorize(['superadmin']), async (req, res) => {
  const schoolId = parseInt(req.params.schoolId);
  const { packageType, maxStudents, expiresAt } = req.body;

  if (!packageType) {
    return res.status(400).json({ error: 'Package type is required' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Generate a license key
    const key = generateLicenseKey({
      schoolName: school.name,
      packageType,
      maxStudents,
      expiresAt
    });

    // Update the school with the new license
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        licenseKey: key,
        isActivated: true,
        packageType,
        maxStudents: maxStudents || (packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : -1),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        subscriptionActive: true
      }
    });

    res.json({ success: true, school: updatedSchool, licenseKey: key });

    // Log generation
    logAction({
      schoolId: null,  // Superadmin global action
      userId: req.user.id,
      action: 'GENERATE_LICENSE',
      resource: 'LICENSE',
      details: {
        targetSchoolId: schoolId,
        schoolName: school.name,
        packageType,
        licenseKey: key
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('License generation error:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// Upgrade a school's package (SuperAdmin only)
router.post('/upgrade/:schoolId', authenticate, authorize(['superadmin']), async (req, res) => {
  const schoolId = parseInt(req.params.schoolId);
  const { packageType, maxStudents, expiresAt } = req.body;

  if (!packageType) {
    return res.status(400).json({ error: 'Package type is required' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        packageType,
        maxStudents: maxStudents || (packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : -1),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        subscriptionActive: true
      }
    });

    res.json({ success: true, message: 'Package upgraded successfully', school: updatedSchool });

    // Log upgrade
    logAction({
      schoolId: 1,
      userId: req.user.id,
      action: 'UPGRADE_PACKAGE',
      resource: 'SCHOOL',
      details: {
        targetSchoolId: schoolId,
        schoolName: school.name,
        oldPackage: school.packageType,
        newPackage: packageType
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Package upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade package' });
  }
});

// List all schools (Global Admin use - mapping to frontend expect)
router.get('/schools', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        isActivated: true,
        packageType: true,
        licenseKey: true,
        expiresAt: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            users: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform for frontend stats if needed
    const transformed = schools.map(s => {
      // Logic from LicenseManagement counts
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      let daysRemaining = -1;
      if (s.expiresAt) {
        const diff = new Date(s.expiresAt) - new Date();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      let status = 'inactive';
      if (s.isActivated) {
        if (!s.expiresAt) status = 'lifetime';
        else if (daysRemaining > 0) status = 'active';
        else status = 'expired';
      }

      return {
        ...s,
        currentStudents: s._count.students,
        status,
        daysRemaining,
        maxStudents: s.packageType === 'basic' ? 500 : s.packageType === 'standard' ? 1500 : -1,
        remainingSlots: s.packageType === 'premium' ? -1 : Math.max(0, (s.packageType === 'basic' ? 500 : 1500) - s._count.students)
      };
    });

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching schools for licensing:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
