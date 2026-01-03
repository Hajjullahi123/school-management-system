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

    // 3. Update global license record if it exists
    try {
      await prisma.license.update({
        where: { licenseKey },
        data: {
          activatedAt: new Date(),
          isActive: true,
          lastCheckedAt: new Date()
        }
      });
    } catch (e) {
      console.log('License tracking record not found or update failed, skipping...');
    }

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

// Generate a new license (Global Admin use - optional partitioning)
router.post('/generate', authenticate, authorize(['superadmin']), async (req, res) => {
  const { schoolName, contactPerson, contactEmail, contactPhone, packageType, maxStudents } = req.body;

  if (!schoolName || !packageType) {
    return res.status(400).json({ error: 'School name and package type are required' });
  }

  try {
    const key = generateLicenseKey({
      schoolName,
      packageType,
      maxStudents,
      expiresAt: null
    });

    const newLicense = await prisma.license.create({
      data: {
        licenseKey: key,
        schoolName,
        contactPerson: contactPerson || '',
        contactEmail: contactEmail || '',
        contactPhone: contactPhone || '',
        packageType,
        maxStudents: maxStudents || (packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : -1)
      }
    });

    res.json({ success: true, license: newLicense });

    // Log generation (Superadmin activity)
    logAction({
      schoolId: 1, // System-level logs mapped to school 1
      userId: req.user.id,
      action: 'GENERATE_LICENSE',
      resource: 'LICENSE',
      details: {
        schoolName,
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

// List all licenses (Global Admin use)
router.get('/list', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(licenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

module.exports = router;
