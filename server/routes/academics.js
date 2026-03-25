const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Helper to get Gemini AI Instance with stable production endpoint
async function getGeminiModel(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { geminiApiKey: true }
  });

  let apiKey = (school?.geminiApiKey && school?.geminiApiKey !== 'NONE') ? school.geminiApiKey : null;
  if (!apiKey) {
    const global = await prisma.globalSettings.findFirst();
    apiKey = (global?.geminiApiKey && global?.geminiApiKey !== 'NONE') ? global.geminiApiKey : null;
  }
  
  // Fallback to Env for Render environments
  if (!apiKey) apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'undefined') return null;

  // Trim to prevent empty character 404s
  const cleanedKey = apiKey.trim();

  const genAI = new GoogleGenerativeAI(cleanedKey);
  // Using gemini-1.5-flash as the standard, but ensuring we don't force a broken endpoint version
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

router.post('/exam-repository', authenticate, authorize(['teacher', 'admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const { title, driveLink, subjectId, classId } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    const { session, term } = await getCurrentSessionAndTerm(schoolId);
    if (!session || !term) return res.status(400).json({ error: 'No active academic session or term found' });

    const examEntry = await prisma.examRepository.create({
      data: {
        schoolId, teacherId,
        subjectId: parseInt(subjectId),
        classId: parseInt(classId),
        title, driveLink,
        termId: term.id,
        academicSessionId: session.id,
        status: 'submitted'
      }
    });

    logAction({ schoolId, userId: teacherId, action: 'SUBMIT_EXAM_LINK', resource: 'EXAM_REPOSITORY', details: { examEntryId: examEntry.id, title }, ipAddress: req.ip });
    res.json(examEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
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
    const { classId, subjectId, topic, count = 10, difficulty = 'medium' } = req.body;
    const schoolId = req.schoolId;

    const model = await getGeminiModel(schoolId);
    if (!model) return res.status(400).json({ error: 'AI not configured', message: 'No Gemini API Key found.' });

    const curriculum = await prisma.curriculum.findUnique({ where: { schoolId_subjectId_classId: { schoolId, subjectId: parseInt(subjectId), classId: parseInt(classId) } } });
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    const prompt = `
      Act as an expert school teacher and examiner. Generate ${count} MCQs for:
      Subject: ${subject.name}, Class: ${classModel.name}, Topic: ${topic || 'General curriculum'}, Difficulty: ${difficulty}
      ${curriculum ? `Reference: ${curriculum.content}` : ''}
      Format: JSON array of objects [{"questionText": "...", "options": [{"id": "a", "text": "..."}, ...], "correctOption": "a", "bloomLevel": "...", "explanation": "...", "points": 1.0}]
      Return ONLY the JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI did not produce valid JSON");
    res.json(JSON.parse(jsonMatch[0]));

    logAction({ schoolId, userId: req.user.id, action: 'AI_GENERATE_CBT', resource: 'CBT_QUESTIONS', details: { subject: subject.name, class: classModel.name, topic, count }, ipAddress: req.ip });
  } catch (error) {
    console.error('AI CBT Error:', error);
    res.status(500).json({ error: 'AI Error', message: `[${new Date().toISOString()}] ${error.message}` });
  }
});

router.post('/ai/generate-lesson-plan', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, type = 'plans' } = req.body;
    const schoolId = req.schoolId;

    const model = await getGeminiModel(schoolId);
    if (!model) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    if (!subject || !classModel) {
        return res.status(404).json({ error: 'Subject or Class not found' });
    }

    const prompt = `Generate a ${type === 'plans' ? 'Lesson Plan' : 'Lesson Note'} for ${subject.name} (Class: ${classModel.name}) on Topic: ${topic}. Use professional Markdown. Headers: Objectives, Hook, Vocabulary, Content, Activities, Assessment, Summary, Homework.`;

    const result = await model.generateContent(prompt);
    res.json({ content: (await result.response).text() });
    logAction({ schoolId, userId: req.user.id, action: 'AI_GENERATE_LESSON_DRAFT', resource: 'LESSON_ACADEMICS', details: { topic, type }, ipAddress: req.ip });
  } catch (error) {
    console.error('[AI ACADEMICS DEBUG]:', error);
    res.status(500).json({ error: 'AI Error', message: `[${new Date().toISOString()}] ${error.message}` });
  }
});

router.post('/ai/suggest-resources', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { topic, subjectId, classId } = req.body;
    const model = await getGeminiModel(req.schoolId);
    if (!model) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    const prompt = `Suggest 3-5 high-quality educational resources for ${topic} in ${subject.name} for ${classModel.name}. Return JSON array: [{"title": "...", "description": "...", "type": "video|article", "searchQuery": "..."}].`;
    const result = await model.generateContent(prompt);
    const jsonMatch = (await result.response).text().match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid format");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    res.status(500).json({ error: 'Failed', message: error.message });
  }
});

router.post('/ai/lesson-chat', authenticate, async (req, res) => {
  try {
    const { lessonNoteId, message, history = [] } = req.body;
    const lesson = await prisma.lessonNote.findUnique({ where: { id: parseInt(lessonNoteId), schoolId: req.schoolId } });
    if (!lesson) return res.status(404).json({ error: 'Not found' });

    const model = await getGeminiModel(req.schoolId);
    if (!model) return res.status(400).json({ error: 'AI unconfigured' });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `Tutor for: ${lesson.topic}. Content: ${lesson.content}` }] },
        { role: "model", parts: [{ text: "Hello! I am your AI Tutor." }] },
        ...history
      ]
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: (await result.response).text() });
  } catch (error) {
    res.status(500).json({ error: 'AI Tutor unavailable' });
  }
});

router.post('/ai/translate-lesson', authenticate, async (req, res) => {
  try {
    const { content, targetLang } = req.body;
    const model = await getGeminiModel(req.schoolId);
    if (!model) return res.status(400).json({ error: 'AI unconfigured' });

    const prompt = `Translate to ${targetLang}, maintain formatting: ${content}`;
    const result = await model.generateContent(prompt);
    res.json({ translated: (await result.response).text() });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
