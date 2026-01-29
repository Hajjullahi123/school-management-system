const express = require('express');
const router = express.Router();
const prisma = require('../db');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const { optionalAuthenticate } = require('../middleware/auth');

// Get school settings
// Can be accessed via schoolSlug (public) or via auth token (private)
router.get('/', async (req, res) => {
  try {
    const schoolSlug = req.query.schoolSlug?.trim().toLowerCase();
    console.log(`Settings request for School Slug: [${schoolSlug}]`);
    let settings;

    if (schoolSlug && schoolSlug !== 'null' && schoolSlug !== 'undefined') {
      const fs = require('fs');
      fs.appendFileSync('server-debug.log', `[${new Date().toISOString()}] Settings request for slug: [${schoolSlug}]\n`);

      settings = await prisma.school.findFirst({
        where: { slug: schoolSlug }
      });

      if (!settings) {
        fs.appendFileSync('server-debug.log', `[${new Date().toISOString()}] Settings - School NOT FOUND for slug: [${schoolSlug}]\n`);
      } else {
        fs.appendFileSync('server-debug.log', `[${new Date().toISOString()}] Settings - School FOUND: ID: ${settings.id}\n`);
      }
    } else {
      // Try to get from token if no slug (for logged in users)
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          settings = await prisma.school.findUnique({
            where: { id: decoded.schoolId }
          });
        } catch (e) {
          console.error('Invalid token in settings fetch');
        }
      }
    }

    if (!settings && !schoolSlug) {
      // Fallback: If no slug and no token, just get the first school
      // This is necessary for the public landing page in single-school setups
      settings = await prisma.school.findFirst();
    }

    if (!settings) {
      return res.status(404).json({ error: `School domain '${schoolSlug}' not found` });
    }

    // Sanitize sensitive fields
    const sanitizedSettings = { ...settings };
    delete sanitizedSettings.paystackSecretKey;
    delete sanitizedSettings.flutterwaveSecretKey;
    delete sanitizedSettings.emailPassword;
    delete sanitizedSettings.smsApiKey;

    // Map fields for frontend compatibility
    sanitizedSettings.schoolName = sanitizedSettings.name;

    // Fetch current academic session
    const currentSession = await prisma.academicSession.findFirst({
      where: {
        schoolId: settings.id,
        isCurrent: true
      }
    });
    sanitizedSettings.currentSession = currentSession;

    res.json(sanitizedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update school settings
router.put('/', authenticate, async (req, res) => {
  const {
    schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto,
    primaryColor, secondaryColor, accentColor,
    paystackPublicKey, paystackSecretKey, flutterwavePublicKey, flutterwaveSecretKey, enableOnlinePayment,
    facebookUrl, instagramUrl, whatsappUrl,
    academicCalendarUrl, eLibraryUrl, alumniNetworkUrl, brochureFileUrl, admissionGuideFileUrl,
    emailUser, emailPassword, emailHost, emailPort, emailSecure,
    smsUsername, smsApiKey, smsSenderId, enableSMS,
    assignment1Weight, assignment2Weight, test1Weight, test2Weight, examWeight,
    openingHours, welcomeTitle, welcomeMessage,
    examMode, examModeType,
    gradingSystem, passThreshold
  } = req.body;

  // Validate weightings if provided
  if (assignment1Weight !== undefined || assignment2Weight !== undefined || test1Weight !== undefined || test2Weight !== undefined || examWeight !== undefined) {
    // If ANY weight is provided, we should probably check current weights if some are missing
    // But for now, let's assume the frontend sends all or we use defaults if it's the first time
    const total =
      Number(assignment1Weight ?? 0) +
      Number(assignment2Weight ?? 0) +
      Number(test1Weight ?? 0) +
      Number(test2Weight ?? 0) +
      Number(examWeight ?? 0);

    if (total !== 100) {
      return res.status(400).json({ error: `Total weighting must equal 100%. Current total: ${total}%` });
    }
  }

  try {
    // Build update object dynamically to avoid setting required fields to undefined
    const updateData = {};

    if (schoolName !== undefined) updateData.name = schoolName;
    if (schoolAddress !== undefined) updateData.address = schoolAddress;
    if (schoolPhone !== undefined) updateData.phone = schoolPhone;
    if (schoolEmail !== undefined) updateData.email = schoolEmail;
    if (schoolMotto !== undefined) updateData.motto = schoolMotto;
    if (openingHours !== undefined) updateData.openingHours = openingHours;
    if (welcomeTitle !== undefined) updateData.welcomeTitle = welcomeTitle;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;

    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;

    if (paystackPublicKey !== undefined) updateData.paystackPublicKey = paystackPublicKey;
    if (paystackSecretKey !== undefined) updateData.paystackSecretKey = paystackSecretKey;
    if (flutterwavePublicKey !== undefined) updateData.flutterwavePublicKey = flutterwavePublicKey;
    if (flutterwaveSecretKey !== undefined) updateData.flutterwaveSecretKey = flutterwaveSecretKey;
    if (enableOnlinePayment !== undefined) updateData.enableOnlinePayment = !!enableOnlinePayment;

    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;
    if (whatsappUrl !== undefined) updateData.whatsappUrl = whatsappUrl;

    if (academicCalendarUrl !== undefined) updateData.academicCalendarUrl = academicCalendarUrl;
    if (eLibraryUrl !== undefined) updateData.eLibraryUrl = eLibraryUrl;
    if (alumniNetworkUrl !== undefined) updateData.alumniNetworkUrl = alumniNetworkUrl;
    if (brochureFileUrl !== undefined) updateData.brochureFileUrl = brochureFileUrl;
    if (admissionGuideFileUrl !== undefined) updateData.admissionGuideFileUrl = admissionGuideFileUrl;

    if (emailUser !== undefined) updateData.emailUser = emailUser;
    if (emailPassword !== undefined) updateData.emailPassword = emailPassword;
    if (emailHost !== undefined) updateData.emailHost = emailHost;
    if (emailPort !== undefined) updateData.emailPort = Number(emailPort);
    if (emailSecure !== undefined) updateData.emailSecure = !!emailSecure;

    if (smsUsername !== undefined) updateData.smsUsername = smsUsername;
    if (smsApiKey !== undefined) updateData.smsApiKey = smsApiKey;
    if (smsSenderId !== undefined) updateData.smsSenderId = smsSenderId;
    if (enableSMS !== undefined) updateData.enableSMS = !!enableSMS;

    if (assignment1Weight !== undefined) updateData.assignment1Weight = Number(assignment1Weight);
    if (assignment2Weight !== undefined) updateData.assignment2Weight = Number(assignment2Weight);
    if (test1Weight !== undefined) updateData.test1Weight = Number(test1Weight);
    if (test2Weight !== undefined) updateData.test2Weight = Number(test2Weight);
    if (examWeight !== undefined) updateData.examWeight = Number(examWeight);

    if (examMode !== undefined) updateData.examMode = !!examMode;
    if (examModeType !== undefined) updateData.examModeType = examModeType;

    if (gradingSystem !== undefined) updateData.gradingSystem = gradingSystem;
    if (passThreshold !== undefined) updateData.passThreshold = Number(passThreshold);

    // Automatically complete setup if basic info is provided
    if (schoolName && schoolAddress && schoolPhone) {
      updateData.isSetupComplete = true;
    }

    const settings = await prisma.school.update({
      where: { id: req.schoolId },
      data: updateData
    });

    // Sanitize response
    const sanitizedSettings = { ...settings };
    delete sanitizedSettings.paystackSecretKey;
    delete sanitizedSettings.flutterwaveSecretKey;
    delete sanitizedSettings.emailPassword;
    delete sanitizedSettings.smsApiKey;
    sanitizedSettings.schoolName = sanitizedSettings.name;

    res.json({ success: true, settings: sanitizedSettings });

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'SCHOOL_SETTINGS',
      details: {
        updatedFields: Object.keys(updateData).filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('password'))
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings: ' + error.message });
  }
});

// NEW: Simple Base64 Logo Upload (No multipart!)\n// Updated to store base64 in database to persist across server restarts
router.post('/logo-base64', authenticate, async (req, res) => {
  console.log('===Base64 logo upload received===');

  try {
    const { imageData, fileName } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Store the FULL base64 data URL (including prefix) in database
    // This ensures it persists across server restarts
    const logoData = imageData; // Keep as data:image/png;base64,xxx format

    // Update database with base64 data
    await prisma.school.update({
      where: { id: req.schoolId },
      data: {
        logoUrl: logoData  // Store base64 data URL directly
      }
    });

    res.json({ success: true, logoUrl: logoData });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'SCHOOL_LOGO',
      details: {
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to save logo: ' + error.message });
  }
});

// Test SMS configuration
router.post('/test-sms', async (req, res) => {
  const { smsUsername, smsApiKey, smsSenderId, testPhone } = req.body;

  if (!smsUsername || !smsApiKey || !testPhone) {
    return res.status(400).json({ error: 'Username, API Key, and Test Phone are required' });
  }

  try {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey: smsApiKey, username: smsUsername });
    const sms = at.SMS;

    const response = await sms.send({
      to: [testPhone],
      message: 'This is a test message from your School Management System.',
      from: smsSenderId || undefined
    });

    console.log('✅ SMS Test Response:', response);
    res.json({ success: true, response });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'TEST_SMS',
      resource: 'SCHOOL_SETTINGS',
      details: {
        testPhone
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('❌ SMS Test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
