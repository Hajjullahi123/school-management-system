const express = require('express');
const router = express.Router();
const prisma = require('../db');
const WhatsAppService = require('../services/WhatsAppService');
const AIQueryHandler = require('../services/AIQueryHandler');
const { logAction } = require('../utils/audit');

// Helper to get school settings by phone number
async function getSchoolByWhatsApp(phoneNumber) {
  // Since multiple schools could use the same system, we need to identify which school
  // this WhatsApp number belongs to by checking school settings
  const schools = await prisma.school.findMany({
    where: {
      whatsappBotEnabled: true,
      whatsappPhoneNumber: phoneNumber
    }
  });

  return schools[0] || null;
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
      students: {
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
          feeRecords: {
            include: {
              academicSession: true,
              term: true
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
  const students = parent.students.map(s => {
    const feeRecord = s.feeRecords[0];
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

  const students = parent.students.map(s => {
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

// Webhook endpoint - Receives WhatsApp messages from Twilio
router.post('/webhook', async (req, res) => {
  try {
    console.log('[WhatsApp Webhook] Received:', req.body);

    // Parse incoming message
    const incomingData = WhatsAppService.parseIncoming(req.body);
    const { from, message } = incomingData;

    // Identify which school this is for (based on the "To" number)
    const school = await getSchoolByWhatsApp(incomingData.to);

    if (!school) {
      console.warn('[WhatsApp] No school found for number:', incomingData.to);
      return res.status(200).send(); // Return 200 to prevent Twilio retries
    }

    // Initialize services
    const whatsappService = new WhatsAppService(
      school.twilioAccountSid,
      school.twilioAuthToken,
      school.whatsappPhoneNumber
    );

    const aiHandler = new AIQueryHandler(school.geminiApiKey);

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
      studentCount: parent.students.length
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

module.exports = router;
