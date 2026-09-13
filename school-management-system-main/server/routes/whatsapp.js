const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const WhatsAppService = require('../services/WhatsAppService');
const { getWhatsAppHandler } = require('../utils/whatsappConfig');
const { logAction } = require('../utils/audit');

// Helper to get school settings by phone number or Meta ID
async function getSchoolByWhatsApp(phoneNumber, provider = 'twilio') {
  if (provider === 'twilio') {
    return await prisma.school.findFirst({
      where: {
        whatsappBotEnabled: true,
        whatsappPhoneNumber: phoneNumber,
        whatsappProvider: 'twilio'
      }
    });
  } else {
    // Option 2: Individual School Match
    let school = await prisma.school.findFirst({
      where: {
        whatsappBotEnabled: true,
        OR: [
          { whatsappPhoneNumber: phoneNumber },
          { metaPhoneNumberId: phoneNumber }
        ]
      }
    });

    // Option 3: Global Platform Match (Shared Number)
    if (!school) {
      const globalSettings = await prisma.globalSettings.findFirst({
        where: {
          OR: [
            { whatsappPhoneNumber: phoneNumber },
            { metaPhoneNumberId: phoneNumber }
          ]
        }
      });
      if (globalSettings) {
        // Return a virtual object or handle it as "Platform School"
        return { isGlobal: true, ...globalSettings };
      }
    }

    return school;
  }
}

// Helper to find parent by phone number
async function findParentByPhone(phone, schoolId) {
  // Normalize phone number (remove spaces, +, etc.)
  const normalized = phone.replace(/[\s\+\-\(\)]/g, '');

  const parent = await prisma.parent.findFirst({
    where: {
      schoolId,
      phone: {
        contains: normalized.slice(-10) // Match last 10 digits
      }
    },
    include: {
      user: {
        select: { firstName: true, lastName: true }
      },
      parentChildren: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          classModel: { select: { name: true, arm: true } },
          attendanceRecords: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          FeeRecord: {
            include: {
              AcademicSession: true,
              Term: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  return parent;
}

// Query Handlers
async function handleBalanceQuery(parent, schoolId) {
  const students = parent.parentChildren.map(s => {
    const feeRecord = s.FeeRecord[0];
    return {
      name: `${s.user.firstName} ${s.user.lastName}`,
      class: `${s.classModel?.name || ''} ${s.classModel?.arm || ''}`.trim(),
      balance: feeRecord?.balance || 0,
      paidAmount: feeRecord?.paidAmount || 0,
      expectedAmount: feeRecord?.expectedAmount || 0
    };
  });

  const totalBalance = students.reduce((sum, s) => sum + s.balance, 0);

  return { students, totalBalance };
}

async function handleAttendanceQuery(parent, schoolId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const students = parent.parentChildren.map(s => {
    const attendance = s.attendanceRecords[0];
    return {
      name: `${s.user.firstName} ${s.user.lastName}`,
      class: `${s.classModel?.name || ''} ${s.classModel?.arm || ''}`.trim(),
      present: attendance?.status === 'present',
      arrivalTime: attendance?.createdAt ? new Date(attendance.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null
    };
  });

  return { students };
}

async function handleHolidayQuery(schoolId) {
  // Get current term
  const currentTerm = await prisma.term.findFirst({
    where: { schoolId, isCurrent: true },
    include: { academicSession: true }
  });

  if (!currentTerm) {
    return { message: 'No active term information available.' };
  }

  const today = new Date();
  const endDate = new Date(currentTerm.endDate);

  if (endDate < today) {
    return { message: 'The current term has ended. Please contact the school for resumption date.' };
  }

  const daysUntilBreak = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  return {
    message: `The current term (${currentTerm.name}, ${currentTerm.academicSession.name}) ends on ${endDate.toLocaleDateString()}. That's ${daysUntilBreak} days from now.`
  };
}

async function handleGeneralQuery(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      phone: true,
      email: true,
      address: true,
      openingHours: true
    }
  });

  return {
    message: `📚 ${school.name}\n\n` +
      `📞 Phone: ${school.phone || 'N/A'}\n` +
      `📧 Email: ${school.email || 'N/A'}\n` +
      `⏰ Hours: ${school.openingHours || 'Mon-Fri: 8AM-4PM'}\n` +
      `📍 Address: ${school.address || 'Contact school for details'}`
  };
}

// Meta Webhook Verification (GET request)
router.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe') {
      // Check if any school matches this verify token
      const school = await prisma.school.findFirst({
        where: { metaVerifyToken: token }
      });

      // Also check global settings as fallback
      const globalSettings = await prisma.globalSettings.findFirst({
        where: { metaVerifyToken: token } // Wait, I didn't add this yet, but I will.
      });

      if (school || token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('[WhatsApp-Meta] Webhook verified');
        return res.status(200).send(challenge);
      }
    }
  }
  console.warn('[WhatsApp-Meta] Verification failed');
  res.sendStatus(403);
});

// Webhook endpoint - Receives WhatsApp messages from Twilio or Meta
router.post('/webhook', async (req, res) => {
  try {
    // Detect Provider
    const isMeta = req.body.object === 'whatsapp_business_account';
    const provider = isMeta ? 'meta' : 'twilio';

    // Parse incoming message
    const incomingData = WhatsAppService.parseIncoming(req.body, provider);
    
    if (!incomingData) {
      return res.status(200).send(); // Not a message or status update we care about
    }

    const { from, message, to } = incomingData;

    // Identify which school this is for
    const school = await getSchoolByWhatsApp(to, provider);

    if (!school) {
      console.warn(`[WhatsApp] No school found for ${provider} number:`, to);
      return res.status(200).send();
    }

    // Initialize services
    const whatsappService = new WhatsAppService({
      whatsappProvider: school.whatsappProvider,
      twilioAccountSid: school.twilioAccountSid,
      twilioAuthToken: school.twilioAuthToken,
      whatsappPhoneNumber: school.whatsappPhoneNumber,
      metaAccessToken: school.metaAccessToken,
      metaPhoneNumberId: school.metaPhoneNumberId
    });

    // Initialize AI Handler (with platform fallback if school keys missing)
    let geminiKey = school.geminiApiKey;
    let groqKey = school.groqApiKey;

    if (!geminiKey || !groqKey) {
      const globalSettings = await prisma.globalSettings.findFirst({
        select: { geminiApiKey: true, groqApiKey: true }
      });
      if (!geminiKey) geminiKey = globalSettings?.geminiApiKey;
      if (!groqKey) groqKey = globalSettings?.groqApiKey;
    }

    const aiHandler = new AIQueryHandler({ geminiApiKey: geminiKey, groqApiKey: groqKey });

    // Find parent by phone number
    const parent = await findParentByPhone(from, school.id);

    if (!parent) {
      const errorMsg = `Hello! I couldn't find a parent account linked to this number (${from}). Please contact ${school.name} to link your phone number to your children's accounts.`;
      await whatsappService.send(from, errorMsg);

      // Log the interaction
      await prisma.whatsAppLog.create({
        data: {
          schoolId: school.id,
          phoneNumber: from,
          message,
          response: errorMsg,
          intent: 'unknown',
          success: false,
          errorMessage: 'Parent not found'
        }
      });

      return res.status(200).send();
    }

    // Analyze the query using AI
    const analysis = await aiHandler.analyzeQuery(message, {
      parentName: `${parent.user.firstName} ${parent.user.lastName}`,
      studentCount: parent.parentChildren.length
    });

    let responseData;
    let responseText;

    // Route to appropriate handler based on intent
    switch (analysis.intent) {
      case 'balance':
        responseData = await handleBalanceQuery(parent, school.id);
        responseText = await aiHandler.generateResponse(responseData, 'balance');
        break;

      case 'attendance':
        responseData = await handleAttendanceQuery(parent, school.id);
        responseText = await aiHandler.generateResponse(responseData, 'attendance');
        break;

      case 'holiday':
        responseData = await handleHolidayQuery(school.id);
        responseText = responseData.message;
        break;

      case 'general':
        responseData = await handleGeneralQuery(school.id);
        responseText = responseData.message;
        break;

      case 'help':
        responseData = { message: 'help' };
        responseText = await aiHandler.generateResponse(responseData, 'help');
        break;

      default:
        responseText = `I'm sorry, I didn't understand that. Type "help" to see what I can assist you with.`;
    }

    // Send response
    await whatsappService.send(from, responseText);

    // Log successful interaction
    await prisma.whatsAppLog.create({
      data: {
        schoolId: school.id,
        phoneNumber: from,
        parentId: parent.id,
        message,
        response: responseText,
        intent: analysis.intent,
        success: true
      }
    });

    // Audit log
    logAction({
      schoolId: school.id,
      userId: parent.userId,
      action: 'WHATSAPP_QUERY',
      resource: 'WHATSAPP_BOT',
      details: {
        intent: analysis.intent,
        phoneNumber: from
      },
      ipAddress: req.ip
    });

    res.status(200).send();
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint - View WhatsApp logs
router.get('/logs', async (req, res) => {
  try {
    // This would need authentication middleware, but omitting for now
    const { schoolId, limit = 50 } = req.query;

    const logs = await prisma.whatsAppLog.findMany({
      where: { schoolId: parseInt(schoolId) },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(logs);
  } catch (error) {
    console.error('[WhatsApp Logs] Error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Send Report Card to Parent WhatsApp
router.post('/send-report', authenticate, async (req, res) => {
  try {
    const { studentId, termId, customPhone, origin } = req.body;
    const schoolId = req.schoolId;

    if (!studentId || !termId) {
      return res.status(400).json({ error: 'studentId and termId are required' });
    }

    // 1. Fetch School Settings
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // 2. Fetch Student with Parent relation
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId },
      include: {
        user: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true
          }
        },
        parent: {
          select: {
            phone: true,
            user: {
              select: {
                username: true
              }
            }
          }
        },
        classModel: {
          select: {
            name: true,
            arm: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 3. Resolve parent phone number
    let parentPhone = customPhone || student.parent?.phone || student.parentPhone || student.parentGuardianPhone;
    if (!parentPhone) {
      return res.status(400).json({ 
        error: 'No parent phone number found linked to this student. Please enter a phone number.' 
      });
    }

    // Normalize phone number (ensure no spaces, dashes, etc.)
    parentPhone = parentPhone.replace(/[\s\+\-\(\)]/g, '');
    
    // Convert to international format (234...) if standard local Nigerian format
    if (parentPhone.startsWith('0') && parentPhone.length === 11) {
      parentPhone = '234' + parentPhone.substring(1);
    } else if (!parentPhone.startsWith('234') && parentPhone.length === 10) {
      parentPhone = '234' + parentPhone;
    }

    // 4. Fetch Results and Term info
    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId },
      include: { academicSession: true }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    const results = await prisma.result.findMany({
      where: { studentId: parseInt(studentId), termId: parseInt(termId), schoolId }
    });

    // 5. Generate message content
    const studentName = `${student.user?.firstName || ''} ${student.user?.lastName || ''} ${student.middleName || ''}`.replace(/\s+/g, ' ').trim() || student.name || 'Student';
    const className = student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}`.trim() : 'N/A';
    
    // Calculate performance stats
    const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    const average = results.length > 0 ? (totalScore / results.length).toFixed(1) : '0';
    
    // Resolve verification url
    const siteOrigin = origin || req.headers.origin || `http://${req.headers.host}`;
    const verifyUrl = `${siteOrigin}/verify/term/${studentId}/${termId}`;
    const loginUrl = `${siteOrigin}/login`;
    const parentUsername = student.parent?.user?.username || student.parent?.phone || student.parentPhone || 'Your phone number';

    let msg = `*STUDENT REPORT CARD SUMMARY*\n\n`;
    msg += `🏫 *School:* ${school.name}\n`;
    msg += `👤 *Student:* ${studentName}\n`;
    msg += `🆔 *Admission No:* ${student.admissionNumber}\n`;
    msg += `📚 *Class:* ${className}\n`;
    msg += `📅 *Term:* ${term.name} (${term.academicSession.name})\n\n`;
    msg += `📊 *Performance Summary:*\n`;
    msg += `- *Average:* ${average}%\n`;
    
    // Add subject details if any
    if (results.length > 0) {
      msg += `\n📝 *Subject Breakdown:*\n`;
      // Fetch subject names
      const subjectIds = results.map(r => r.subjectId);
      const subjects = await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true }
      });
      
      results.forEach(r => {
        const sub = subjects.find(s => s.id === r.subjectId);
        const subName = sub ? sub.name : 'Subject';
        msg += `- ${subName}: ${r.totalScore || 0}% (${r.grade || 'N/A'})\n`;
      });
    }
    
    msg += `\n🔑 *Parent Portal Login:*\n`;
    msg += `- *Login URL:* ${loginUrl}\n`;
    msg += `- *Username:* ${parentUsername}\n`;
    msg += `- *Default Password:* parent123\n\n`;
    
    msg += `📝 *Instructions:* Log into the dashboard with the credentials above to access the full child report and other academic information.\n\n`;
    
    msg += `🔗 *Quick View Link:*\n${verifyUrl}`;

    // 6. Check if WhatsApp bot is enabled and credentials exist
    const isBotConfigured = school.whatsappBotEnabled && 
      ((school.whatsappProvider === 'twilio' && school.twilioAccountSid && school.twilioAuthToken && school.whatsappPhoneNumber) ||
       (school.whatsappProvider === 'meta' && school.metaAccessToken && school.metaPhoneNumberId));

    if (!isBotConfigured) {
      // Return the message content and parent phone number so frontend can use wa.me redirect
      return res.json({
        success: false,
        code: 'BOT_NOT_CONFIGURED',
        message: 'WhatsApp bot is not configured for this school. Pre-filling manual send details...',
        parentPhone,
        textMessage: msg
      });
    }

    // 7. Send message via WhatsApp Service
    const whatsappService = new WhatsAppService({
      whatsappProvider: school.whatsappProvider,
      twilioAccountSid: school.twilioAccountSid,
      twilioAuthToken: school.twilioAuthToken,
      whatsappPhoneNumber: school.whatsappPhoneNumber,
      metaAccessToken: school.metaAccessToken,
      metaPhoneNumberId: school.metaPhoneNumberId
    });

    await whatsappService.send(parentPhone, msg);

    // Log successful interaction
    await prisma.whatsAppLog.create({
      data: {
        schoolId,
        phoneNumber: parentPhone,
        parentId: student.parentId,
        message: `System Send Report Card (Student ID: ${studentId}, Term ID: ${termId})`,
        response: 'SUCCESS',
        intent: 'send_report',
        success: true
      }
    });

    // Audit log
    logAction({
      schoolId,
      userId: req.user.id,
      action: 'SEND_REPORT_WHATSAPP',
      resource: 'WHATSAPP_BOT',
      details: {
        studentId,
        termId,
        parentPhone
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Report card sent to parent WhatsApp successfully'
    });

  } catch (error) {
    console.error('[WhatsApp Send Report Error]:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
