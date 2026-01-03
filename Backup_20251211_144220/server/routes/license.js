const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateLicenseKey, validateLicense, checkActivationStatus } = require('../utils/license');

// Get current license status
router.get('/status', async (req, res) => {
  try {
    const status = await checkActivationStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking license status:', error);
    res.status(500).json({ error: 'Failed to check license status' });
  }
});

// Activate the system with a license key
router.post('/activate', async (req, res) => {
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

    const licenseData = validation.license; // Payload from the key

    // 2. Update or create SchoolSettings
    let settings = await prisma.schoolSettings.findFirst();

    if (settings) {
      settings = await prisma.schoolSettings.update({
        where: { id: settings.id },
        data: {
          licenseKey,
          isActivated: true,
          schoolName: schoolName || licenseData.schoolName || settings.schoolName,
          schoolAddress: schoolAddress || settings.schoolAddress,
          schoolPhone: schoolPhone || settings.schoolPhone,
          schoolEmail: schoolEmail || settings.schoolEmail
        }
      });
    } else {
      settings = await prisma.schoolSettings.create({
        data: {
          licenseKey,
          isActivated: true,
          schoolName: schoolName || licenseData.schoolName || 'My School',
          schoolAddress,
          schoolPhone,
          schoolEmail
        }
      });
    }

    // 3. Upsert license record locally (So we can query limits easily)
    // We search by licenseKey since we don't know the ID (or it might not exist locally)
    await prisma.license.upsert({
      where: { licenseKey },
      update: {
        schoolName: licenseData.schoolName,
        packageType: licenseData.packageType,
        maxStudents: licenseData.maxStudents,
        expiresAt: licenseData.expiresAt ? new Date(licenseData.expiresAt) : null,
        isActive: true,
        activatedAt: new Date(),
        lastCheckedAt: new Date()
      },
      create: {
        licenseKey,
        schoolName: licenseData.schoolName || 'Activated School',
        contactPerson: 'System Authorization',
        contactEmail: 'system@local',
        contactPhone: '0000',
        packageType: licenseData.packageType,
        maxStudents: licenseData.maxStudents,
        expiresAt: licenseData.expiresAt ? new Date(licenseData.expiresAt) : null,
        isActive: true,
        activatedAt: new Date(),
        lastCheckedAt: new Date()
      }
    });

    res.json({ success: true, message: 'System activated successfully', settings });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ error: 'Activation failed' });
  }
});

// Generate a new license (For Admin/Seller use)
router.post('/generate', async (req, res) => {
  const { schoolName, contactPerson, contactEmail, contactPhone, packageType, maxStudents } = req.body;

  if (!schoolName || !packageType) {
    return res.status(400).json({ error: 'School name and package type are required' });
  }

  try {
    const key = generateLicenseKey({
      schoolName,
      packageType,
      maxStudents,
      expiresAt: null // Can added to req.body if needed
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
  } catch (error) {
    console.error('License generation error:', error);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// List all licenses (For Admin/Seller use)
router.get('/list', async (req, res) => {
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
