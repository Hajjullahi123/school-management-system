const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// Submit Exam Google Drive Link (Teacher)
router.post('/exam-repository', authenticate, authorize(['teacher', 'admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const { title, driveLink, subjectId, classId } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    const { session, term } = await getCurrentSessionAndTerm(schoolId);
    if (!session || !term) {
      return res.status(400).json({ error: 'No active academic session or term found' });
    }

    const examEntry = await prisma.examRepository.create({
      data: {
        schoolId,
        teacherId,
        subjectId: parseInt(subjectId),
        classId: parseInt(classId),
        title,
        driveLink,
        termId: term.id,
        academicSessionId: session.id,
        status: 'submitted'
      }
    });

    logAction({
      schoolId,
      userId: teacherId,
      action: 'SUBMIT_EXAM_LINK',
      resource: 'EXAM_REPOSITORY',
      details: { examEntryId: examEntry.id, title },
      ipAddress: req.ip
    });

    res.json(examEntry);
  } catch (error) {
    console.error('Exam repository submission error:', error);
    res.status(500).json({ error: 'Failed to submit exam link' });
  }
});

// Get Exam Repository (Admin/Exam Officer/Teacher theirs)
router.get('/exam-repository', authenticate, authorize(['admin', 'principal', 'examination_officer', 'superadmin', 'teacher']), async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { termId, academicSessionId, classId, subjectId } = req.query;

    const where = { schoolId };
    
    // Teachers only see their own submissions unless they have a higher role
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    }

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
    console.error('Fetch exam repository error:', error);
    res.status(500).json({ error: 'Failed to fetch exam repository' });
  }
});

// ================= LESSON PLANS & NOTES =================

// Create/Update Lesson Plan
router.post('/lesson-plans', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id, classId, subjectId, week, topic, content, status } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    if (id) {
      // Update
      const existing = await prisma.lessonPlan.findUnique({ where: { id: parseInt(id) } });
      if (!existing || (req.user.role === 'teacher' && existing.teacherId !== teacherId)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updated = await prisma.lessonPlan.update({
        where: { id: parseInt(id) },
        data: {
          classId: classId ? parseInt(classId) : undefined,
          subjectId: subjectId ? parseInt(subjectId) : undefined,
          week: week ? parseInt(week) : undefined,
          topic,
          content,
          status
        }
      });
      return res.json(updated);
    } else {
      // Create
      const created = await prisma.lessonPlan.create({
        data: {
          schoolId,
          teacherId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          week: parseInt(week),
          topic,
          content,
          status: status || 'draft'
        }
      });
      res.json(created);
    }
  } catch (error) {
    console.error('Lesson plan error:', error);
    res.status(500).json({ error: 'Failed to save lesson plan' });
  }
});

// Get Lesson Plans
router.get('/lesson-plans', authenticate, async (req, res) => {
  try {
    const { classId, subjectId, teacherId, status } = req.query;
    const where = { schoolId: req.schoolId };

    if (classId) where.classId = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (status) where.status = status;

    // Teachers only see their own unless admin/principal
    if (req.user.role === 'teacher' && !teacherId) {
       where.teacherId = req.user.id;
    }

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

// Create/Update Lesson Note
router.post('/lesson-notes', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { id, classId, subjectId, week, topic, content, status } = req.body;
    const schoolId = req.schoolId;
    const teacherId = req.user.id;

    if (id) {
      const existing = await prisma.lessonNote.findUnique({ where: { id: parseInt(id) } });
      if (!existing || (req.user.role === 'teacher' && existing.teacherId !== teacherId)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updated = await prisma.lessonNote.update({
        where: { id: parseInt(id) },
        data: {
          classId: classId ? parseInt(classId) : undefined,
          subjectId: subjectId ? parseInt(subjectId) : undefined,
          week: week ? parseInt(week) : undefined,
          topic,
          content,
          status
        }
      });
      return res.json(updated);
    } else {
      const created = await prisma.lessonNote.create({
        data: {
          schoolId,
          teacherId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          week: parseInt(week),
          topic,
          content,
          status: status || 'draft'
        }
      });
      res.json(created);
    }
  } catch (error) {
    console.error('Lesson note error:', error);
    res.status(500).json({ error: 'Failed to save lesson note' });
  }
});

// Get Lesson Notes
router.get('/lesson-notes', authenticate, async (req, res) => {
    try {
      const { classId, subjectId, teacherId, status } = req.query;
      const where = { schoolId: req.schoolId };
  
      if (classId) where.classId = parseInt(classId);
      if (subjectId) where.subjectId = parseInt(subjectId);
      if (teacherId) where.teacherId = parseInt(teacherId);
      if (status) where.status = status;
  
      if (req.user.role === 'teacher' && !teacherId) {
         where.teacherId = req.user.id;
      }
  
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

// Create/Update Curriculum (Syllabus)
router.post('/curriculum', authenticate, authorize(['admin', 'principal', 'superadmin', 'teacher']), async (req, res) => {
  try {
    const { id, classId, subjectId, content } = req.body;
    const schoolId = req.schoolId;

    if (id) {
        const updated = await prisma.curriculum.update({
          where: { id: parseInt(id) },
          data: { content }
        });
        return res.json(updated);
    } else {
        const curriculum = await prisma.curriculum.upsert({
            where: {
                schoolId_subjectId_classId: {
                    schoolId,
                    subjectId: parseInt(subjectId),
                    classId: parseInt(classId)
                }
            },
            update: { content },
            create: {
                schoolId,
                subjectId: parseInt(subjectId),
                classId: parseInt(classId),
                content
            }
        });
        res.json(curriculum);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Curriculum
router.get('/curriculum', authenticate, async (req, res) => {
    try {
        const { classId, subjectId } = req.query;
        if (!classId || !subjectId) return res.status(400).json({ error: 'Class and Subject IDs required' });

        const curriculum = await prisma.curriculum.findUnique({
            where: {
                schoolId_subjectId_classId: {
                    schoolId: req.schoolId,
                    subjectId: parseInt(subjectId),
                    classId: parseInt(classId)
                }
            }
        });
        res.json(curriculum || { content: '' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ================= AI CBT GENERATION =================

router.post('/ai/generate-cbt', authenticate, authorize(['teacher', 'admin', 'principal', 'examination_officer', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, count = 10, difficulty = 'medium' } = req.body;
    const schoolId = req.schoolId;

    // 1. Get School Gemini API Key
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { geminiApiKey: true }
    });

    if (!school?.geminiApiKey) {
      return res.status(400).json({ 
        error: 'AI feature not configured', 
        message: 'Please provide a Gemini API Key in School Settings to use AI Generation.' 
      });
    }

    // 2. Get Curriculum for context (optional but recommended)
    const curriculum = await prisma.curriculum.findUnique({
      where: {
        schoolId_subjectId_classId: {
          schoolId,
          subjectId: parseInt(subjectId),
          classId: parseInt(classId)
        }
      }
    });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    // 3. Prompt Engineering
    const genAI = new GoogleGenerativeAI(school.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Act as an expert school teacher and examiner.
      Generate ${count} multiple-choice CBT questions for:
      Subject: ${subject.name}
      Class: ${classModel.name}
      Topic: ${topic || 'General curriculum'}
      Difficulty: ${difficulty}
      ${curriculum ? `Reference the following Curriculum/Syllabus: ${curriculum.content}` : ''}

      Format your response as a valid JSON array of objects. Each object MUST have:
      - questionText: The question string
      - options: An array of exactly 4 objects: [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}]
      - correctOption: Either "a", "b", "c", or "d"
      - bloomLevel: One of [Remembering, Understanding, Applying, Analyzing, Evaluating, Creating]
      - explanation: A brief explanation of why the answer is correct
      - points: 1.0

      Return ONLY the JSON array. No markdown code blocks, no preamble, no explanation.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up text if AI included markdown blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const questions = JSON.parse(text);

    res.json(questions);

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'AI_GENERATE_CBT',
      resource: 'CBT_QUESTIONS',
      details: { subject: subject.name, class: classModel.name, topic, count },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate questions using AI' });
  }
});

router.post('/ai/generate-lesson-plan', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { classId, subjectId, topic, type = 'plans' } = req.body;
    const schoolId = req.schoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { geminiApiKey: true }
    });

    if (!school?.geminiApiKey) {
      return res.status(400).json({ error: 'AI feature not configured' });
    }

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    const genAI = new GoogleGenerativeAI(school.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Act as an expert pedagogical consultant and master teacher. 
      Generate a comprehensive and engaging ${type === 'plans' ? 'Lesson Plan' : 'Lesson Note'} for:
      Subject: ${subject.name}
      Class: ${classModel.name}
      Topic: ${topic}
      
      Structure the response using professional academic standards:
      1. Learning Objectives (aligned with SMART goals and Bloom's Taxonomy)
      2. Anticipatory Set (an engaging "hook" to capture student interest)
      3. Key Vocabulary/Concepts
      4. Detailed Content Breakdown (Step-by-step introduction and core explanation)
      5. Practical Illustrations/In-Class Activities
      6. Assessment Questions (Oral or written to check understanding)
      7. Summary and Conclusion
      8. Homework/Follow-up Project
      9. Differentiated Instruction Tips (Tips for supporting diverse learners)

      Use clean, professional Markdown for formatting. Be thorough but concise.
      Return ONLY the content of the lesson document.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ content: response.text() });

    logAction({
      schoolId,
      userId: req.user.id,
      action: 'AI_GENERATE_LESSON_DRAFT',
      resource: 'LESSON_ACADEMICS',
      details: { subject: subject.name, class: classModel.name, topic, type },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('AI Lesson Scaffolding Error:', error);
    res.status(500).json({ error: 'Failed to scaffold lesson content' });
  }
});

router.post('/ai/suggest-resources', authenticate, authorize(['teacher', 'admin', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { topic, subjectId, classId } = req.body;
    const schoolId = req.schoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { geminiApiKey: true }
    });

    if (!school?.geminiApiKey) return res.status(400).json({ error: 'AI not configured' });

    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
    const classModel = await prisma.class.findUnique({ where: { id: parseInt(classId) } });

    const genAI = new GoogleGenerativeAI(school.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      As an expert educational curator for ${classModel.name} level students.
      Suggest 3-5 high-quality, safe, and engaging educational resources for the topic: "${topic}" in the subject "${subject.name}".
      Include:
      - YouTube video titles/brief descriptions (and if possible, suggest what to search for)
      - Interactive simulations (like PhET) if applicable
      - Academic articles or reliable websites (National Geographic, Britannica, etc.)
      
      Return ONLY a JSON array of objects: [{"title": "...", "description": "...", "type": "video|article|simulation", "searchQuery": "..."}]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(text));

  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/ai/lesson-chat', authenticate, async (req, res) => {
  try {
    const { lessonNoteId, message, history = [] } = req.body;
    const schoolId = req.schoolId;

    const lesson = await prisma.lessonNote.findUnique({
      where: { id: parseInt(lessonNoteId), schoolId }
    });

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { geminiApiKey: true }
    });

    if (!school?.geminiApiKey) return res.status(400).json({ error: 'AI not configured' });

    const genAI = new GoogleGenerativeAI(school.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // RAG: Inject lesson content as system instructions
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `You are an AI Tutor for the following school lesson:
            Topic: ${lesson.topic}
            Content: ${lesson.content}
            Your goal is to answer student questions STRICTLY based on this content. If they ask something unrelated, politely steer them back to the lesson. Be encouraging and use simple language.` }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am now your dedicated tutor for this lesson. How can I help you understand the material better today?" }]
        },
        ...history
      ]
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ reply: response.text() });

  } catch (error) {
    console.error('AI Tutor Error:', error);
    res.status(500).json({ error: 'AI Tutor is currently unavailable' });
  }
});

router.post('/ai/translate-lesson', authenticate, async (req, res) => {
  try {
    const { content, targetLang } = req.body;
    const schoolId = req.schoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { geminiApiKey: true }
    });

    if (!school?.geminiApiKey) return res.status(400).json({ error: 'AI not configured' });

    const genAI = new GoogleGenerativeAI(school.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Translate the following educational content into professional and grammatically correct ${targetLang}. 
      Ensure educational terms are translated accurately or explained in context.
      Maintain the original formatting.
      Content: ${content}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ translated: response.text() });

  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

module.exports = router;
