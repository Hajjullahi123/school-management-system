const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/branding';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Always name it logo with timestamp to avoid caching issues
    const ext = path.extname(file.originalname);
    cb(null, `school-logo-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Get school settings
router.get('/', async (req, res) => {
  try {
    let settings = await prisma.schoolSettings.findFirst();

    // If no settings exist, return defaults
    if (!settings) {
      settings = {
        schoolName: 'School Management System',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#60a5fa',
        isActivated: false
      };
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update school settings
router.put('/', async (req, res) => {
  const {
    schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto,
    primaryColor, secondaryColor, accentColor,
    paystackPublicKey, paystackSecretKey, flutterwavePublicKey, flutterwaveSecretKey, enableOnlinePayment
  } = req.body;

  try {
    let settings = await prisma.schoolSettings.findFirst();

    if (settings) {
      settings = await prisma.schoolSettings.update({
        where: { id: settings.id },
        data: {
          schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto,
          primaryColor, secondaryColor, accentColor,
          paystackPublicKey, paystackSecretKey, flutterwavePublicKey, flutterwaveSecretKey, enableOnlinePayment
        }
      });
    } else {
      settings = await prisma.schoolSettings.create({
        data: {
          schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto,
          primaryColor, secondaryColor, accentColor,
          paystackPublicKey, paystackSecretKey, flutterwavePublicKey, flutterwaveSecretKey, enableOnlinePayment
        }
      });
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Upload school logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const logoUrl = `/uploads/branding/${req.file.filename}`;

    let settings = await prisma.schoolSettings.findFirst();

    if (settings) {
      await prisma.schoolSettings.update({
        where: { id: settings.id },
        data: { logoUrl }
      });
    } else {
      await prisma.schoolSettings.create({
        data: {
          logoUrl,
          schoolName: 'My School'
        }
      });
    }

    res.json({ success: true, logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to save logo' });
  }
});

module.exports = router;
