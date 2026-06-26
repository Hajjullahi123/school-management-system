const express = require('express');
const router = express.Router();
const prisma = require('../db');
const https = require('https');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { uploadFile } = require('../services/storageService');
const { sendEmail } = require('../services/emailService');
const WhatsAppService = require('../services/WhatsAppService');
const { authenticate } = require('../middleware/auth');
const { generateAdmissionNumber, getUniqueAdmissionNumber } = require('../utils/studentUtils');
const { createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Helper: send multi-channel notifications
const sendAdmissionsNotification = async (school, app, type = 'payment_confirmed') => {
  const whatsappConfig = {
    whatsappProvider: school.whatsappProvider,
    twilioAccountSid: school.twilioAccountSid,
    twilioAuthToken: school.twilioAuthToken,
    whatsappPhoneNumber: school.whatsappPhoneNumber,
    metaAccessToken: school.metaAccessToken,
    metaPhoneNumberId: school.metaPhoneNumberId
  };

  const candidateName = `${app.candidateFirstName} ${app.candidateLastName}`;
  
  let subject = '';
  let emailHtml = '';
  let smsMessage = '';
  let whatsappMessage = '';

  if (type === 'payment_confirmed') {
    subject = `Admission Application Form Purchased - ${school.name}`;
    
    smsMessage = `Hello ${app.parentName}, payment for ${candidateName}'s admission form was successful. Use Application Code: ${app.applicationCode} to fill the form at ${process.env.CLIENT_URL || 'http://localhost:5173'}/${school.slug}/admissions.`;
    
    whatsappMessage = `Hello *${app.parentName}*,\n\nYour payment for *${candidateName}*'s admission form has been received successfully.\n\n🔑 *Application Code*: \`${app.applicationCode}\`\n\nPlease visit the portal to complete the detailed application form.\n\nThank you,\n*${school.name}*`;

    emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1e40af;">Admission Form Payment Confirmed</h2>
        <p>Hello <strong>${app.parentName}</strong>,</p>
        <p>Thank you for purchasing the admission application form for <strong>${candidateName}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">🔑 Your Unique Application Code: <strong style="font-size: 18px; color: #1e40af;">${app.applicationCode}</strong></p>
        </div>
        <p>Please use this code to access, fill out, and submit the complete application form on our school website.</p>
        <p>If you paid offline, please note that it might take up to 24 hours for the administration to verify and unlock your form code.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>${school.name}</strong></p>
      </div>
    `;
  } else if (type === 'admitted') {
    subject = `Congratulations! Admission Offer - ${school.name}`;
    
    smsMessage = `Congratulations ${app.parentName}! ${candidateName} has been offered admission to ${school.name}. Please check your email or login to the portal for details.`;
    
    whatsappMessage = `Congratulations *${app.parentName}*! 🎉\n\nWe are pleased to inform you that *${candidateName}* has been offered admission to *${school.name}* for the class *${app.gradeLevel}*.\n\nPlease check your email for the official offer letter and next steps.\n\nBest regards,\n*${school.name}*`;

    emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #16a34a;">Congratulations! Admission Offered</h2>
        <p>Hello <strong>${app.parentName}</strong>,</p>
        <p>We are absolutely thrilled to inform you that <strong>${candidateName}</strong> has been offered admission into <strong>${app.gradeLevel}</strong> at <strong>${school.name}</strong>.</p>
        <p>Our admissions committee was highly impressed by your application, and we believe your child will make an outstanding addition to our school family.</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <p style="margin: 5px 0 0 0;">An administrative staff member will reach out to you shortly with details regarding fee payments, uniform collection, and the resumption date.</p>
        </div>
        <br/>
        <p>Warmest regards,</p>
        <p><strong>${school.name} Admissions Desk</strong></p>
      </div>
    `;
  }

  // 1. Send Email
  if (app.parentEmail) {
    await sendEmail(app.parentEmail, subject, emailHtml);
  }

  // 2. Send SMS (if SMS is enabled)
  if (school.enableSMS && school.smsUsername && school.smsApiKey && app.parentPhone) {
    try {
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({ apiKey: school.smsApiKey, username: school.smsUsername });
      await at.SMS.send({
        to: [app.parentPhone],
        message: smsMessage,
        from: school.smsSenderId || undefined
      });
      console.log(`[Admissions-SMS] Notification sent to ${app.parentPhone}`);
    } catch (e) {
      console.error('[Admissions-SMS] Failed to send SMS:', e.message);
    }
  }

  // 3. Send WhatsApp (if WhatsApp bot is enabled)
  if (school.whatsappBotEnabled && app.parentPhone) {
    try {
      const whatsapp = new WhatsAppService(whatsappConfig);
      await whatsapp.send(app.parentPhone, WhatsAppService.formatMessage(whatsappMessage));
      console.log(`[Admissions-WhatsApp] Notification sent to ${app.parentPhone}`);
    } catch (e) {
      console.error('[Admissions-WhatsApp] Failed to send WhatsApp:', e.message);
    }
  }
};

// Auto generate secure application code
const generateAppCode = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ADM-${year}-${rand}`;
};

/**
 * @route   POST /api/admissions/initialize-payment
 * @desc    Initialize admission form payment or register offline payment request
 */
router.post('/initialize-payment', async (req, res) => {
  const {
    schoolSlug,
    parentName,
    parentEmail,
    parentPhone,
    candidateFirstName,
    candidateLastName,
    candidateMiddleName,
    gender,
    dateOfBirth,
    gradeLevel,
    previousSchool,
    provider = 'paystack'
  } = req.body;

  if (!schoolSlug || !parentName || !parentEmail || !parentPhone || !candidateFirstName || !candidateLastName || !gradeLevel) {
    return res.status(400).json({ error: 'Missing required field details' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const price = school.admissionFormPrice || 0;
    const applicationCode = generateAppCode();
    const reference = `ADM-PAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // Bypassed Payment: Free Form (Price is 0)
    if (price === 0) {
      const newApp = await prisma.admissionApplication.create({
        data: {
          schoolId: school.id,
          applicationCode,
          parentName,
          parentEmail,
          parentPhone,
          candidateFirstName,
          candidateLastName,
          candidateMiddleName,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gradeLevel,
          previousSchool,
          paymentStatus: 'paid',
          status: 'draft',
          paymentReference: reference
        }
      });

      await sendAdmissionsNotification(school, newApp, 'payment_confirmed');
      return res.json({ success: true, applicationCode, paymentStatus: 'paid', price: 0 });
    }

    // Offline Payment Request
    if (provider === 'offline') {
      const newApp = await prisma.admissionApplication.create({
        data: {
          schoolId: school.id,
          applicationCode,
          parentName,
          parentEmail,
          parentPhone,
          candidateFirstName,
          candidateLastName,
          candidateMiddleName,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gradeLevel,
          previousSchool,
          paymentStatus: 'pending',
          status: 'draft',
          paymentReference: reference
        }
      });

      return res.json({ 
        success: true, 
        applicationCode, 
        paymentStatus: 'pending', 
        isOffline: true,
        reference,
        price
      });
    }

    // --- ONLINE PAYMENT GATEWAY FLOW ---
    if (provider === 'paystack') {
      if (!school.paystackSecretKey) return res.status(400).json({ error: 'Paystack is not configured' });

      // Create draft app first
      await prisma.admissionApplication.create({
        data: {
          schoolId: school.id,
          applicationCode,
          parentName,
          parentEmail,
          parentPhone,
          candidateFirstName,
          candidateLastName,
          candidateMiddleName,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gradeLevel,
          previousSchool,
          paymentStatus: 'pending',
          status: 'draft',
          paymentReference: reference
        }
      });

      const params = JSON.stringify({
        email: parentEmail,
        amount: Math.round(price * 100),
        reference,
        callback_url: `${req.headers.origin || 'http://localhost:5173'}/${schoolSlug}/admissions?verify=${reference}`,
        metadata: { applicationCode }
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${school.paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const paystackReq = https.request(options, paystackRes => {
        let data = '';
        paystackRes.on('data', chunk => data += chunk);
        paystackRes.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              res.json({ success: true, authorization_url: response.data.authorization_url, reference });
            } else {
              res.status(400).json({ error: response.message });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Paystack initialize' });
          }
        });
      });
      paystackReq.on('error', e => res.status(500).json({ error: 'Paystack init error' }));
      paystackReq.write(params);
      paystackReq.end();
    }

    else if (provider === 'flutterwave') {
      if (!school.flutterwaveSecretKey) return res.status(400).json({ error: 'Flutterwave is not configured' });

      await prisma.admissionApplication.create({
        data: {
          schoolId: school.id,
          applicationCode,
          parentName,
          parentEmail,
          parentPhone,
          candidateFirstName,
          candidateLastName,
          candidateMiddleName,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
          gradeLevel,
          previousSchool,
          paymentStatus: 'pending',
          status: 'draft',
          paymentReference: reference
        }
      });

      const params = JSON.stringify({
        tx_ref: reference,
        amount: price,
        currency: 'NGN',
        redirect_url: `${req.headers.origin || 'http://localhost:5173'}/${schoolSlug}/admissions?verify=${reference}`,
        customer: { email: parentEmail, name: parentName, phone_number: parentPhone },
        meta: { applicationCode },
        customizations: {
          title: `${school.name} Admission Form`,
          logo: school.logoUrl ? `${process.env.BASE_URL || ''}${school.logoUrl}` : null
        }
      });

      const options = {
        hostname: 'api.flutterwave.com',
        port: 443,
        path: '/v3/payments',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${school.flutterwaveSecretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const fwReq = https.request(options, fwRes => {
        let data = '';
        fwRes.on('data', chunk => data += chunk);
        fwRes.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status === 'success') {
              res.json({ success: true, authorization_url: response.data.link, reference });
            } else {
              res.status(400).json({ error: response.message });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Flutterwave response' });
          }
        });
      });
      fwReq.on('error', e => res.status(500).json({ error: 'Flutterwave init error' }));
      fwReq.write(params);
      fwReq.end();
    }
  } catch (error) {
    console.error('Initialize admission error:', error);
    res.status(500).json({ error: 'Failed to initialize application' });
  }
});

/**
 * @route   POST /api/admissions/verify-payment
 * @desc    Verify payment reference
 */
router.post('/verify-payment', async (req, res) => {
  const { reference, schoolSlug, provider } = req.body;

  if (!reference || !schoolSlug || !provider) {
    return res.status(400).json({ error: 'Missing verification fields' });
  }

  try {
    const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const application = await prisma.admissionApplication.findUnique({
      where: { paymentReference: reference }
    });

    if (!application) return res.status(404).json({ error: 'Application reference not found' });
    if (application.paymentStatus === 'paid') {
      return res.json({ success: true, applicationCode: application.applicationCode });
    }

    if (provider === 'paystack') {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${school.paystackSecretKey}`
        }
      };

      const verifyReq = https.request(options, verifyRes => {
        let data = '';
        verifyRes.on('data', chunk => data += chunk);
        verifyRes.on('end', async () => {
          try {
            const response = JSON.parse(data);
            if (response.status && response.data.status === 'success') {
              const updatedApp = await prisma.admissionApplication.update({
                where: { id: application.id },
                data: { paymentStatus: 'paid' }
              });

              await sendAdmissionsNotification(school, updatedApp, 'payment_confirmed');
              res.json({ success: true, applicationCode: updatedApp.applicationCode });
            } else {
              res.status(400).json({ error: 'Payment verification failed' });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Paystack verification response' });
          }
        });
      });
      verifyReq.on('error', e => res.status(500).json({ error: 'Paystack verification request error' }));
      verifyReq.end();
    }

    else if (provider === 'flutterwave') {
      // Find transaction by reference from Flutterwave first
      const options = {
        hostname: 'api.flutterwave.com',
        port: 443,
        path: `/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${school.flutterwaveSecretKey}`
        }
      };

      const verifyReq = https.request(options, verifyRes => {
        let data = '';
        verifyRes.on('data', chunk => data += chunk);
        verifyRes.on('end', async () => {
          try {
            const response = JSON.parse(data);
            if (response.status === 'success' && response.data.status === 'successful') {
              const updatedApp = await prisma.admissionApplication.update({
                where: { id: application.id },
                data: { paymentStatus: 'paid' }
              });

              await sendAdmissionsNotification(school, updatedApp, 'payment_confirmed');
              res.json({ success: true, applicationCode: updatedApp.applicationCode });
            } else {
              res.status(400).json({ error: 'Payment verification failed' });
            }
          } catch (e) {
            res.status(500).json({ error: 'Failed to parse Flutterwave verify response' });
          }
        });
      });
      verifyReq.on('error', e => res.status(500).json({ error: 'Flutterwave verification request error' }));
      verifyReq.end();
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * @route   GET /api/admissions/application/:code
 * @desc    Get details of a specific application form by code
 */
router.get('/application/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const application = await prisma.admissionApplication.findUnique({
      where: { applicationCode: code },
      include: { School: { select: { name: true, slug: true, admissionFormPrice: true } } }
    });

    if (!application) {
      return res.status(404).json({ error: 'Invalid application code' });
    }

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Failed to retrieve application details' });
  }
});

/**
 * @route   POST /api/admissions/application/:code/save
 * @desc    Save/update draft details of application
 */
router.post('/application/:code/save', async (req, res) => {
  const { code } = req.params;
  const data = req.body;

  try {
    const application = await prisma.admissionApplication.findUnique({
      where: { applicationCode: code }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'draft') {
      return res.status(400).json({ error: 'Application has already been submitted and cannot be edited.' });
    }

    const updated = await prisma.admissionApplication.update({
      where: { applicationCode: code },
      data: {
        parentName: data.parentName,
        parentEmail: data.parentEmail,
        parentPhone: data.parentPhone,
        parentAddress: data.parentAddress,
        candidateFirstName: data.candidateFirstName,
        candidateLastName: data.candidateLastName,
        candidateMiddleName: data.candidateMiddleName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gradeLevel: data.gradeLevel,
        previousSchool: data.previousSchool
      }
    });

    res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Save application error:', error);
    res.status(500).json({ error: 'Failed to save application' });
  }
});

/**
 * @route   POST /api/admissions/application/:code/submit
 * @desc    Submit application (transitions to submitted, locks edits)
 */
router.post('/application/:code/submit', async (req, res) => {
  const { code } = req.params;

  try {
    const application = await prisma.admissionApplication.findUnique({
      where: { applicationCode: code }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Please clear payment before submitting the application.' });
    }

    const updated = await prisma.admissionApplication.update({
      where: { applicationCode: code },
      data: { status: 'submitted' }
    });

    res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * @route   POST /api/admissions/application/:code/upload
 * @desc    Upload documents
 */
router.post('/application/:code/upload', upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'birthCert', maxCount: 1 },
  { name: 'reportCard', maxCount: 1 }
]), async (req, res) => {
  const { code } = req.params;

  try {
    const application = await prisma.admissionApplication.findUnique({
      where: { applicationCode: code }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const updateData = {};

    if (req.files.passport) {
      const passportUrl = await uploadFile(req.files.passport[0], `admissions/${code}/passport`);
      updateData.passportPhotoUrl = passportUrl;
    }
    if (req.files.birthCert) {
      const birthCertUrl = await uploadFile(req.files.birthCert[0], `admissions/${code}/birthCert`);
      updateData.birthCertUrl = birthCertUrl;
    }
    if (req.files.reportCard) {
      const reportCardUrl = await uploadFile(req.files.reportCard[0], `admissions/${code}/reportCard`);
      updateData.reportCardUrl = reportCardUrl;
    }

    const updated = await prisma.admissionApplication.update({
      where: { applicationCode: code },
      data: updateData
    });

    res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
});

/* ── ADMINISTRATIVE DASHBOARD ENDPOINTS [PROTECTED] ── */

/**
 * @route   GET /api/admissions/admin/list
 * @desc    Retrieve all admissions applications for the current school
 */
router.get('/admin/list', authenticate, async (req, res) => {
  try {
    const list = await prisma.admissionApplication.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Get applications list error:', error);
    res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

/**
 * @route   PUT /api/admissions/admin/:id/status
 * @desc    Change application status or manually verify offline payment
 */
router.put('/admin/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  try {
    const application = await prisma.admissionApplication.findFirst({
      where: { id: parseInt(id), schoolId: req.schoolId }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const updateData = {};
    if (status) updateData.status = status;
    
    // Admin manually verifying offline payment
    if (paymentStatus === 'paid' && application.paymentStatus !== 'paid') {
      updateData.paymentStatus = 'paid';
      const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
      
      const updatedApp = await prisma.admissionApplication.update({
        where: { id: application.id },
        data: updateData
      });

      await sendAdmissionsNotification(school, updatedApp, 'payment_confirmed');
      return res.json({ success: true, application: updatedApp });
    }

    const updated = await prisma.admissionApplication.update({
      where: { id: application.id },
      data: updateData
    });

    res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * @route   POST /api/admissions/admin/:id/convert
 * @desc    Convert an admitted applicant into an active Student/User/Parent
 */
router.post('/admin/:id/convert', authenticate, async (req, res) => {
  const { id } = req.params;
  const { classId, admissionNumberOverride } = req.body;

  if (!classId) return res.status(400).json({ error: 'Class placement is required' });

  try {
    const schoolId = req.schoolId;
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const classPlacement = await prisma.class.findFirst({ where: { id: parseInt(classId), schoolId } });

    if (!school) return res.status(404).json({ error: 'School not found' });
    if (!classPlacement) return res.status(404).json({ error: 'Target Class not found' });

    const app = await prisma.admissionApplication.findFirst({
      where: { id: parseInt(id), schoolId }
    });

    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Applicant form has not been paid yet.' });
    }

    // 1. Generate Admission Number
    let uniqueAdmissionNumber = admissionNumberOverride ? admissionNumberOverride.trim() : '';
    if (!uniqueAdmissionNumber) {
      const baseCode = generateAdmissionNumber(
        school.code || 'SCH',
        new Date().getFullYear(),
        classPlacement.name,
        classPlacement.arm
      );
      uniqueAdmissionNumber = await getUniqueAdmissionNumber(prisma, baseCode, classPlacement.id, schoolId);
    }

    // Check collision
    const existingStudent = await prisma.student.findFirst({
      where: { schoolId, admissionNumber: uniqueAdmissionNumber }
    });
    if (existingStudent) {
      return res.status(400).json({ error: `Admission number ${uniqueAdmissionNumber} already exists.` });
    }

    // 2. Create User account for student
    const username = uniqueAdmissionNumber.toLowerCase();
    const defaultPassword = '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const generatedEmail = app.parentEmail || `${username}@school.com`;

    const user = await prisma.user.create({
      data: {
        schoolId,
        firstName: app.candidateFirstName,
        lastName: app.candidateLastName,
        middleName: app.candidateMiddleName,
        username,
        email: generatedEmail,
        passwordHash: hashedPassword,
        role: 'student',
        mustChangePassword: false
      }
    });

    // 3. Create parent user/profile if not matching
    let parentId = null;
    const sanitizedPhone = app.parentPhone.replace(/[^\d+]/g, '');

    const matchingParent = await prisma.parent.findFirst({
      where: {
        schoolId,
        OR: [
          { phone: sanitizedPhone },
          { phone: { contains: sanitizedPhone.startsWith('0') ? sanitizedPhone.substring(1) : sanitizedPhone } }
        ]
      }
    });

    if (matchingParent) {
      parentId = matchingParent.id;
    } else {
      // Create new Parent User
      const pUsername = `parent_${sanitizedPhone}`;
      const pEmail = app.parentEmail || `${pUsername}@school.com`;
      const pPasswordHash = await bcrypt.hash('123456', 10);

      const pUser = await prisma.user.create({
        data: {
          schoolId,
          firstName: app.parentName.split(' ')[0] || 'Parent',
          lastName: app.parentName.split(' ').slice(1).join(' ') || 'Guardian',
          username: pUsername,
          email: pEmail,
          passwordHash: pPasswordHash,
          role: 'parent',
          mustChangePassword: false
        }
      });

      const parent = await prisma.parent.create({
        data: {
          schoolId,
          userId: pUser.id,
          phone: sanitizedPhone,
          address: app.parentAddress
        }
      });

      parentId = parent.id;
    }

    // 4. Create student profile
    const studentName = app.candidateMiddleName 
      ? `${app.candidateFirstName} ${app.candidateMiddleName} ${app.candidateLastName}`
      : `${app.candidateFirstName} ${app.candidateLastName}`;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: user.id,
        admissionNumber: uniqueAdmissionNumber,
        classId: classPlacement.id,
        middleName: app.candidateMiddleName,
        dateOfBirth: app.dateOfBirth,
        gender: app.gender,
        parentGuardianName: app.parentName,
        parentGuardianPhone: app.parentPhone,
        parentEmail: app.parentEmail,
        address: app.parentAddress,
        parentId,
        nationality: 'Nigerian',
        name: studentName,
        rollNo: uniqueAdmissionNumber,
        photoUrl: app.passportPhotoUrl
      }
    });

    // 5. Initialize Fee Record for new student
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true, schoolId },
      include: { academicSession: true }
    });

    if (currentTerm) {
      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: {
          classId: classPlacement.id,
          termId: currentTerm.id,
          academicSessionId: currentTerm.academicSessionId,
          schoolId
        }
      });

      if (feeStructure) {
        await createOrUpdateFeeRecordWithOpening({
          prisma,
          schoolId,
          studentId: student.id,
          classId: classPlacement.id,
          termId: currentTerm.id,
          academicSessionId: currentTerm.academicSessionId,
          openingBalance: 0,
          expectedAmount: feeStructure.totalAmount || 0,
          clearedByUserId: null
        });
      }
    }

    // 6. Update Application state to admitted
    await prisma.admissionApplication.update({
      where: { id: app.id },
      data: { status: 'admitted' }
    });

    // 7. Send Congratulations notification to parent (Email, SMS, WhatsApp)
    await sendAdmissionsNotification(school, app, 'admitted');

    res.json({ success: true, studentId: student.id, admissionNumber: uniqueAdmissionNumber });
  } catch (error) {
    console.error('Convert applicant error:', error);
    res.status(500).json({ error: 'Failed to convert applicant to student: ' + error.message });
  }
});

module.exports = router;
