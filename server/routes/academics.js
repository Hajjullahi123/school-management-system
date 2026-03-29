const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const AIQueryHandler = require('../services/AIQueryHandler');
const { getWhatsAppHandler } = require('../utils/whatsappConfig');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for PDF Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/exams';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `exam-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to get AI Handler for a school (supports Gemini + Groq failover with Platform Fallback)
async function getAIHandler(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { geminiApiKey: true, groqApiKey: true }
  });

  let geminiKey = (school?.geminiApiKey && school?.geminiApiKey !== 'NONE') ? school.geminiApiKey : null;
  let groqKey = (school?.groqApiKey && school?.groqApiKey !== 'NONE') ? school.groqApiKey : null;
  
  // If school doesn't have keys, check Global Settings (Platform Fallback)
  if (!geminiKey || !groqKey) {
    const globalSettings = await prisma.globalSettings.findFirst({
      select: { geminiApiKey: true, groqApiKey: true }
    });
    
    if (!geminiKey && globalSettings?.geminiApiKey) geminiKey = globalSettings.geminiApiKey;
    if (!groqKey && globalSettings?.groqApiKey) groqKey = globalSettings.groqApiKey;
  }

  if (!geminiKey && !groqKey) return null;
  return new AIQueryHandler({ geminiApiKey: geminiKey, groqApiKey: groqKey });
}

// Helper to get current session and term
async function getCurrentSessionAndTerm(schoolId) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true, schoolId }
  });
  const term = await prisma.term.findFirst({
    where: { isCurrent: true, schoolId }
  });
  return { session, term };
}

// ================= EXAM REPOSITORY =================

// Updated POST to handle Multiparts (File + Fields)
router.post('/exam-repository', authenticate, authorize(['teacher', 'admin', 'principal', 'examination_officer', 'superadmin']), upload.single('examFile'), async (req, res) => {
  try {
    const { title, driveLink, subjectId, classId } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    const { session, term } = await getCurrentSessionAndTerm(schoolId);
    if (!session || !term) return res.status(400).json({ error: 'No active academic session or term found' });

    const fileUrl = req.file ? `/uploads/exams/${req.file.filename}` : null;

    const examEntry = await prisma.examRepository.create({
      data: {
        schoolId, teacherId,
        subjectId: parseInt(subjectId),
        classId: parseInt(classId),
        title, 
        driveLink: driveLink || null,
        fileUrl,
        termId: term.id,
        academicSessionId: session.id,
        status: 'submitted'
      }
    });

    logAction({ schoolId, userId: teacherId, action: 'SUBMIT_EXAM', resource: 'EXAM_REPOSITORY', details: { examEntryId: examEntry.id, title, hasFile: !!fileUrl }, ipAddress: req.ip });
    res.json(examEntry);
  } catch (error) {
    console.error('[ExamRepo] Error:', error);
    res.status(500).json({ error: error.message || 'Failed' });
  }
});

router.get('/exam-repository', authenticate, authorize(['admin', 'principal', 'examination_officer', 'superadmin', 'teacher']), async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { termId, academicSessionId, classId, subjectId } = req.query;
    const where = { schoolId };
    
    if (req.user.role === 'teacher') where.teacherId = req.user.id;
    if (termId) where.termId = parseInt(termId);
    if (academicSessionId) where.academicSessionId = parseInt(academicSessionId);
    if (classId) where.classId = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);

    const exams = await prisma.examRepository.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
        class: { select: { name: true, arm: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET Monitoring Data: Teachers vs Assigned Subjects Status
router.get('/exam-monitoring', authenticate, authorize(['admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { sessionId, termId } = req.query;

    let session, term;
    if (sessionId && termId) {
      [session, term] = await Promise.all([
        prisma.academicSession.findUnique({ where: { id: parseInt(sessionId) } }),
        prisma.term.findUnique({ where: { id: parseInt(termId) } })
      ]);
    } else {
      const active = await getCurrentSessionAndTerm(schoolId);
      session = active.session;
      term = active.term;
    }

    if (!session || !term) return res.status(400).json({ error: 'Session or term not found' });

    // 1. Get all teachers
    const teachers = await prisma.user.findMany({
      where: { schoolId, role: 'teacher', isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true }
    });

    // 2. Get all assignments for these teachers
    const assignments = await prisma.teacherAssignment.findMany({
      where: { schoolId },
      include: {
        classSubject: {
          include: {
            class: { select: { name: true, arm: true } },
            subject: { select: { id: true, name: true } }
          }
        }
      }
    });

    // 3. Get all submissions for current term/session
    const submissions = await prisma.examRepository.findMany({
      where: { schoolId, termId: term.id, academicSessionId: session.id }
    });

    // 4. Group by teacher
    const monitoringData = teachers.map(teacher => {
      const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);
      
      const statusList = teacherAssignments.map(a => {
        const isSubmitted = submissions.some(s => 
          s.teacherId === teacher.id && 
          s.subjectId === a.classSubject.subjectId && 
          s.classId === a.classSubject.classId
        );
        return {
          class: `${a.classSubject.class.name} ${a.classSubject.class.arm}`,
          subject: a.classSubject.subject.name,
          subjectId: a.classSubject.subjectId,
          classId: a.classSubject.classId,
          isSubmitted
        };
      });

      return {
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        phone: teacher.phone,
        assignments: statusList,
        total: statusList.length,
        submitted: statusList.filter(s => s.isSubmitted).length
      };
    });

    res.json(monitoringData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// DELETE Exam Submission
router.delete('/exam-repository/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const exam = await prisma.examRepository.findUnique({
      where: { id: parseInt(id) }
    });

    if (!exam) return res.status(404).json({ error: 'Exam submission not found' });

    // Ownership check: Only uploader or Admin can delete
    if (exam.teacherId !== userId && !['admin', 'superadmin', 'principal', 'examination_officer'].includes(userRole)) {
      return res.status(403).json({ error: 'You are not authorized to delete this submission' });
    }

    // Status check: Prevent deletion of approved exams
    if (exam.status === 'approved' && !['admin', 'superadmin'].includes(userRole)) {
      return res.status(400).json({ error: 'Approved exams cannot be deleted. Contact Admin.' });
    }

    // Delete file from disk if exists
    if (exam.fileUrl) {
      const fs = require('fs');
      const path = require('path');
      // fileUrl is likely relative to public or root
      const filePath = path.join(__dirname, '..', '..', exam.fileUrl); 
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('File deletion error:', e);
        }
      }
    }

    await prisma.examRepository.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Exam submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Nudge Teacher
router.post('/nudge-teacher', authenticate, authorize(['admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const { teacherId, message, nudgeType = 'whatsapp', subjectName, className } = req.body;
    const schoolId = req.schoolId;

    const teacher = await prisma.user.findUnique({ 
      where: { id: parseInt(teacherId) },
      select: { id: true, firstName: true, lastName: true, phone: true }
    });
    
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    let nudgeMessage = message;
    if (!nudgeMessage) {
      if (subjectName && className) {
        nudgeMessage = `Hello ${teacher.firstName}, this is a reminder to upload your examination questions for ${subjectName} (${className}). Thank you.`;
      } else {
        nudgeMessage = `Hello ${teacher.firstName}, this is a reminder to upload your pending examination questions to the portal. Thank you.`;
      }
    }

    if (nudgeType === 'whatsapp' || nudgeType === 'both') {
      if (!teacher.phone) {
        if (nudgeType === 'whatsapp') return res.status(400).json({ error: 'Teacher missing phone number for WhatsApp nudge' });
      } else {
        const schoolWhatsApp = await getWhatsAppHandler(schoolId);
        if (schoolWhatsApp) {
          await schoolWhatsApp.send(teacher.phone, nudgeMessage);
        } else {
          console.warn('[Nudge] Skipping WhatsApp - Not configured');
          if (nudgeType === 'whatsapp') return res.status(400).json({ error: 'WhatsApp is not configured for this school or platform.' });
        }
      }
    }

    if (nudgeType === 'dashboard' || nudgeType === 'both') {
      await prisma.notice.create({
        data: {
          schoolId,
          title: 'Exam Repository Reminder',
          content: nudgeMessage,
          audience: `user:${teacher.id}`,
          authorId: req.user.id
        }
      });
    }
    
    logAction({ 
      schoolId, 
      userId: req.user.id, 
      action: 'NUDGE_TEACHER', 
      resource: 'EXAM_REPOSITORY', 
      details: { teacherId, teacherName: teacher.firstName, nudgeType, subjectName, className }, 
      ipAddress: req.ip 
    });
    
    res.json({ success: true, message: 'Nudge sent successfully' });
  } catch (error) {
    console.error('Nudge Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send nudge' });
  }
});

// ================= LESSON PLANS & NOTES =================

router.post('/lesson-plans', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id, classId, subjectId, week, topic, content, status } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    if (id) {
      const existing = await prisma.lessonPlan.findUnique({ where: { id: parseInt(id) } });
      if (!existing || (req.user.role === 'teacher' && existing.teacherId !== teacherId)) return res.status(403).json({ error: 'Unauthorized' });

      const updated = await prisma.lessonPlan.update({
        where: { id: parseInt(id) },
        data: {
          classId: classId ? parseInt(classId) : undefined,
          subjectId: subjectId ? parseInt(subjectId) : undefined,
          week: week ? parseInt(week) : undefined,
          topic, content, status
        }
      });
      return res.json(updated);
    } else {
      const created = await prisma.lessonPlan.create({
        data: {
          schoolId, teacherId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          week: parseInt(week),
          topic, content,
          status: status || 'draft'
        }
      });
      res.json(created);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/lesson-plans', authenticate, async (req, res) => {
  try {
    const { classId, subjectId, teacherId, status } = req.query;
    const where = { schoolId: req.schoolId };
    if (classId) where.classId = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (status) where.status = status;
    if (req.user.role === 'teacher' && !teacherId) where.teacherId = req.user.id;

    const plans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
        class: { select: { name: true, arm: true } }
      },
      orderBy: { week: 'desc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/lesson-notes', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id, classId, subjectId, week, topic, content, status } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    if (id) {
      const existing = await prisma.lessonNote.findUnique({ where: { id: parseInt(id) } });
      if (!existing || (req.user.role === 'teacher' && existing.teacherId !== teacherId)) return res.status(403).json({ error: 'Unauthorized' });

      const updated = await prisma.lessonNote.update({
        where: { id: parseInt(id) },
        data: {
          classId: classId ? parseInt(classId) : undefined,
          subjectId: subjectId ? parseInt(subjectId) : undefined,
          week: week ? parseInt(week) : undefined,
          topic, content, status
        }
      });
      return res.json(updated);
    } else {
      const created = await prisma.lessonNote.create({
        data: {
          schoolId, teacherId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          week: parseInt(week),
          topic, content,
          status: status || 'draft'
        }
      });
      res.json(created);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/lesson-notes', authenticate, async (req, res) => {
    try {
      const { classId, subjectId, teacherId, status } = req.query;
      const where = { schoolId: req.schoolId };
      if (classId) where.classId = parseInt(classId);
      if (subjectId) where.subjectId = parseInt(subjectId);
      if (teacherId) where.teacherId = parseInt(teacherId);
      if (status) where.status = status;
      if (req.user.role === 'teacher' && !teacherId) where.teacherId = req.user.id;
  
      const notes = await prisma.lessonNote.findMany({
        where,
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          subject: { select: { name: true } },
          class: { select: { name: true, arm: true } }
        },
        orderBy: { week: 'desc' }
      });
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
});

// ================= CURRICULUM =================

router.post('/curriculum', authenticate, authorize(['admin', 'principal', 'superadmin', 'teacher']), async (req, res) => {
  try {
    const { id, classId, subjectId, content } = req.body;
    const schoolId = req.schoolId;

    if (id) {
        const updated = await prisma.curriculum.update({ where: { id: parseInt(id) }, data: { content } });
        return res.json(updated);
    } else {
        const curriculum = await prisma.curriculum.upsert({
            where: { schoolId_subjectId_classId: { schoolId, subjectId: parseInt(subjectId), classId: parseInt(classId) } },
            update: { content },
            create: { schoolId, subjectId: parseInt(subjectId), classId: parseInt(classId), content }
        });
        res.json(curriculum);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/curriculum', authenticate, async (req, res) => {
    try {
        const { classId, subjectId } = req.query;
        if (!classId || !subjectId) return res.status(400).json({ error: 'Class and Subject IDs required' });
        const curriculum = await prisma.curriculum.findUnique({
            where: { schoolId_subjectId_classId: { schoolId: req.schoolId, subjectId: parseInt(subjectId), classId: parseInt(classId) } }
        });
        res.json(curriculum || { content: '' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ================= AI FEATURES (STABLE v1) =================

router.post('/ai/generate-cbt', authenticate, authorize(['teacher', 'admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, count = 10, difficulty = 'medium', language = 'English' } = req.body;
    const schoolId = req.schoolId;

    const aiHandler = await getAIHandler(schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI not configured', message: 'No valid School Gemini API Key found.' });

    const curriculum = await prisma.curriculum.findUnique({ where: { schoolId_subjectId_classId: { schoolId, subjectId: parseInt(subjectId), classId: parseInt(classId) } } });
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    if (!subject || !classModel) {
        return res.status(404).json({ error: 'Subject or Class not found', message: 'The selected subject or class is no longer valid.' });
    }

    const prompt = `
      Act as an expert school teacher and examiner. Generate ${count} MCQs for:
      Subject: ${subject.name}, Class: ${classModel.name}, Topic: ${topic || 'General curriculum'}, Difficulty: ${difficulty}
      Language: ${language}
      ${curriculum ? `Reference: ${curriculum.content}` : ''}
      CRITICAL: All question text, options, and explanations MUST be in ${language}.
      Format: JSON array of objects [{"questionText": "...", "options": [{"id": "a", "text": "..."}, ...], "correctOption": "a", "bloomLevel": "...", "explanation": "...", "points": 1.0}]
      Return ONLY the JSON.
    `;

    const text = await aiHandler.generate(prompt, true);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI did not produce valid JSON block");
    
    let parsedQuestions;
    try {
        const rawQuestions = JSON.parse(jsonMatch[0]);
        parsedQuestions = aiHandler.deepSanitize(rawQuestions);
    } catch (e) {
        throw new Error("AI produced invalid JSON: " + e.message);
    }
    res.json(parsedQuestions);

    logAction({ schoolId, userId: req.user.id, action: 'AI_GENERATE_CBT', resource: 'CBT_QUESTIONS', details: { subject: subject.name, class: classModel.name, topic, count }, ipAddress: req.ip });
  } catch (error) {
    console.error('AI CBT Error:', error);
    res.status(500).json({ error: 'AI Error', message: `[${new Date().toISOString()}] ${error.message}` });
  }
});

router.post('/ai/generate-lesson-plan', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, type = 'plans', language = 'English', detailLevel = '500' } = req.body;
    const schoolId = req.schoolId;

    const aiHandler = await getAIHandler(schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    if (!subject || !classModel) {
        return res.status(404).json({ error: 'Subject or Class not found' });
    }

    const prompt = `Generate a highly detailed and comprehensive ${type === 'plans' ? 'Lesson Plan' : 'Lesson Note'} for ${subject.name} (Class: ${classModel.name}) on Topic: ${topic}. 
    Language: ${language}.
    Target Length: Approximately ${detailLevel} words.
    CRITICAL: The entire content MUST be written in ${language}, MUST conform to modern educational standards, and MUST be in line with current academic trends.
    Use professional Markdown. Headers: Objectives, Hook, Vocabulary, Detailed Content, Modern Learning Activities, Standardized Assessment, Summary, Homework.`;

    const text = await aiHandler.generate(prompt);
    res.json({ content: text });
    logAction({ schoolId, userId: req.user.id, action: 'AI_GENERATE_LESSON_DRAFT', resource: 'LESSON_ACADEMICS', details: { topic, type }, ipAddress: req.ip });
  } catch (error) {
    console.error('[AI ACADEMICS DEBUG]:', error);
    res.status(500).json({ error: 'AI Error', message: `[${new Date().toISOString()}] ${error.message}` });
  }
});

router.post('/ai/generate-essay', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, language = 'English', difficulty = 'medium' } = req.body;
    const schoolId = req.schoolId;

    const aiHandler = await getAIHandler(schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    if (!subject || !classModel) {
        return res.status(404).json({ error: 'Subject or Class not found' });
    }

    const prompt = `Act as an expert school teacher and examiner. Generate 5-10 high-quality theory/essay examination questions for Subject: ${subject.name}, Class: ${classModel.name}, Topic: ${topic}. 
    Difficulty Level: ${difficulty.toUpperCase()} (where simple = direct/recall, medium = application, difficult = critical thinking/complex analysis).
    Language: ${language}. 
    CRITICAL: The questions MUST be structured as essay questions (e.g., 1a, 1b, 2, 3a, 3b, etc.). Do NOT provide multiple-choice options (A, B, C). Provide the questions in a clear, numbered markdown format suitable for direct printing or saving as a PDF. Do NOT use JSON. Include a separate "Sample Answers/Marking Guide" section at the very end. The content MUST be written entirely in ${language}.`;

    const text = await aiHandler.generate(prompt);
    res.json({ content: text });
    logAction({ schoolId, userId: req.user.id, action: 'AI_GENERATE_ESSAY', resource: 'LESSON_ACADEMICS', details: { topic }, ipAddress: req.ip });
  } catch (error) {
    console.error('[AI ACADEMICS DEBUG]:', error);
    res.status(500).json({ error: 'AI Error', message: `[${new Date().toISOString()}] ${error.message}` });
  }
});

router.post('/ai/suggest-resources', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { topic, subjectId, classId } = req.body;
    const aiHandler = await getAIHandler(req.schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    const prompt = `Suggest 3-5 high-quality educational resources for ${topic} in ${subject.name} for ${classModel.name}. Return JSON array: [{"title": "...", "description": "...", "type": "video|article", "searchQuery": "..."}].`;
    const text = await aiHandler.generate(prompt, true);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid format");
    const rawResources = JSON.parse(jsonMatch[0]);
    const sanitizedResources = aiHandler.deepSanitize(rawResources);
    res.json(sanitizedResources);
  } catch (error) {
    res.status(500).json({ error: 'Failed', message: error.message });
  }
});

router.post('/ai/lesson-chat', authenticate, async (req, res) => {
  try {
    const { lessonNoteId, message, history = [] } = req.body;
    const lesson = await prisma.lessonNote.findUnique({ where: { id: parseInt(lessonNoteId), schoolId: req.schoolId } });
    if (!lesson) return res.status(404).json({ error: 'Not found' });

    const aiHandler = await getAIHandler(req.schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI unconfigured' });

    // Format history for Gemini
    const chatHistory = history.map(h => h.role === 'user' ? `User: ${h.content}` : `Assistant: ${h.content}`).join('\n');
    const prompt = `You are a helpful AI Tutor for the topic: ${lesson.topic}. Lesson Content: ${lesson.content}\n\nChat History:\n${chatHistory}\n\nUser: ${message}\n\nAssistant:`;

    const reply = await aiHandler.generate(prompt);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'AI Tutor unavailable' });
  }
});

router.post('/ai/translate-lesson', authenticate, async (req, res) => {
  try {
    const { content, targetLang } = req.body;
    const aiHandler = await getAIHandler(req.schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI unconfigured' });

    const prompt = `Translate to ${targetLang}, maintain formatting: ${content}`;
    const text = await aiHandler.generate(prompt);
    res.json({ translated: text });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
