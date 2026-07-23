const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { calculateTotalScore, getGrade, calculateClassAverage, calculatePositions } = require('../utils/grading');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { uploadFile } = require('../services/storageService');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// ============ TEACHER ROUTES ============

// Download Bulk Question Template (CSV)
router.get('/template/questions', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CBT Questions');

    worksheet.columns = [
      { header: 'Question Text', key: 'questionText', width: 50 },
      { header: 'Option A', key: 'a', width: 25 },
      { header: 'Option B', key: 'b', width: 25 },
      { header: 'Option C', key: 'c', width: 25 },
      { header: 'Option D', key: 'd', width: 25 },
      { header: 'Correct Option (a, b, c, or d)', key: 'correctOption', width: 25 },
      { header: 'Points', key: 'points', width: 10 }
    ];

    // Add example row
    worksheet.addRow({
      questionText: 'What is the capital of France?',
      a: 'Berlin',
      b: 'Madrid',
      c: 'Paris',
      d: 'London',
      correctOption: 'c',
      points: 1
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=CBT_Questions_Template.csv');
    await workbook.csv.write(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Upload Questions
router.post('/:id/questions/bulk', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), upload.single('file'), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Verify ownership
    const exam = await prisma.cBTExam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const workbook = new ExcelJS.Workbook();
    let rows = [];

    if (req.file.originalname.endsWith('.csv')) {
      const csvStr = req.file.buffer.toString();
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(req.file.buffer);
    }

    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    const expectedHeaders = ['Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option'];
    const actualHeaders = [
      headerRow.getCell(1).value?.toString() || '',
      headerRow.getCell(2).value?.toString() || '',
      headerRow.getCell(3).value?.toString() || '',
      headerRow.getCell(4).value?.toString() || '',
      headerRow.getCell(5).value?.toString() || '',
      headerRow.getCell(6).value?.toString() || ''
    ];

    const isValidHeader = expectedHeaders.every((h, i) => actualHeaders[i].toLowerCase().includes(h.toLowerCase()));
    if (!isValidHeader) {
      return res.status(400).json({ error: 'Invalid file format. Please use the correct CBT Questions Template.' });
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const questionText = row.getCell(1).value?.toString()?.trim();
      const optA = row.getCell(2).value?.toString()?.trim();
      const optB = row.getCell(3).value?.toString()?.trim();
      const optC = row.getCell(4).value?.toString()?.trim();
      const optD = row.getCell(5).value?.toString()?.trim();
      const correct = row.getCell(6).value?.toString()?.trim()?.toLowerCase();
      const points = parseFloat(row.getCell(7).value) || 1;

      if (questionText && optA && optB && optC && optD && correct) {
        // Validate correct option
        if (!['a', 'b', 'c', 'd'].includes(correct)) return;

        rows.push({
          questionText,
          options: [
            { id: 'a', text: optA },
            { id: 'b', text: optB },
            { id: 'c', text: optC },
            { id: 'd', text: optD }
          ],
          correctOption: correct,
          points
        });
      }
    });

    if (rows.length === 0) return res.status(400).json({ error: 'No valid questions found in file' });

    const { saveToBank } = req.body;
    const saveToBankBool = saveToBank === 'true' || saveToBank === true;

    // Transaction to create questions (and optionally bank questions)
    const result = await prisma.$transaction(async (tx) => {
      const createdQuestions = await Promise.all(
        rows.map(q => tx.cBTQuestion.create({
          data: {
            schoolId: req.schoolId,
            examId,
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctOption: q.correctOption,
            points: q.points
          }
        }))
      );

      if (saveToBankBool) {
        await Promise.all(
          rows.map(q => tx.cBTQuestionBank.create({
            data: {
              schoolId: req.schoolId,
              teacherId: req.user.id,
              subjectId: exam.subjectId,
              classId: exam.classId,
              questionText: q.questionText,
              options: JSON.stringify(q.options),
              correctOption: q.correctOption,
              points: q.points
            }
          }))
        );
      }

      return createdQuestions;
    });

    res.json({
      message: `Successfully imported ${result.length} questions${saveToBankBool ? ' and saved to bank' : ''}`,
      count: result.length
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'IMPORT',
      resource: 'CBT_QUESTIONS',
      details: { examId, count: result.length },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all exams created by teacher or all for admin/principal
router.get('/teacher', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { termId } = req.query;
    const where = { schoolId: req.schoolId };
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    }
    if (termId) {
      where.termId = parseInt(termId);
    }

    const exams = await prisma.cBTExam.findMany({
      where,
      include: {
        Class: true,
        Subject: true,
        _count: {
          select: {
            CBTQuestion: { where: { schoolId: req.schoolId } },
            CBTResult: { where: { schoolId: req.schoolId } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize for frontend compatibility
    const normalized = exams.map(e => ({
      ...e,
      class: e.Class,
      subject: e.Subject,
      _count: { questions: e._count?.CBTQuestion || 0, results: e._count?.CBTResult || 0 },
      Class: undefined,
      Subject: undefined
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Exam (Admin/Principal/Teacher)
router.post('/', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const {
      title, description, classId, subjectId,
      durationMinutes, totalMarks, startDate, endDate,
      examType, randomizeQuestions, randomizeOptions, token
    } = req.body;

    // Validation for teachers
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId: req.schoolId,
          teacherId: req.user.id,
          classSubject: {
            classId: parseInt(classId),
            subjectId: parseInt(subjectId)
          }
        }
      });
      if (!assignment) {
        return res.status(403).json({ error: 'You are not assigned to teach this subject in this class' });
      }
    }

    // Get current session and term
    const currentSession = await prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      }
    });
    const currentTerm = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        schoolId: req.schoolId
      }
    });

    if (!currentSession || !currentTerm) {
      return res.status(400).json({ error: 'No active session or term found for this school' });
    }

    // Current session and term check passed


    // ... validation ...

    const exam = await prisma.cBTExam.create({
      data: {
        schoolId: req.schoolId,
        title,
        description,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        academicSessionId: currentSession.id,
        termId: currentTerm.id,
        durationMinutes: parseInt(durationMinutes),
        totalMarks: parseFloat(totalMarks),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isPublished: false,
        randomizeQuestions: randomizeQuestions !== undefined ? !!randomizeQuestions : true,
        randomizeOptions: randomizeOptions !== undefined ? !!randomizeOptions : true,
        examType: examType || 'examination',
        token: token || null
      }
    });

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Exam Details
router.put('/:id', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const {
      title, description, durationMinutes, totalMarks, startDate, endDate,
      examType, randomizeQuestions, randomizeOptions, token
    } = req.body;

    const exam = await prisma.cBTExam.findFirst({
      where: { id: examId, schoolId: req.schoolId }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this exam' });
    }

    const updated = await prisma.cBTExam.update({
      where: { id: examId },
      data: {
        title,
        description,
        durationMinutes: parseInt(durationMinutes) || undefined,
        totalMarks: parseFloat(totalMarks) || undefined,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        examType,
        randomizeQuestions: randomizeQuestions !== undefined ? !!randomizeQuestions : undefined,
        randomizeOptions: randomizeOptions !== undefined ? !!randomizeOptions : undefined,
        token: token !== undefined ? (token || null) : undefined
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Questions to Exam (Admin/Principal/Teacher)
router.post('/:id/questions', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { questions, saveToBank } = req.body; // Array of questions

    // Verify ownership
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to add questions to this exam' });
    }

    // ... inside transaction ...
    const createdQuestions = await prisma.$transaction(async (tx) => {
      const examQuestions = await Promise.all(
        questions.map(q => tx.cBTQuestion.create({
          data: {
            schoolId: req.schoolId,
            examId,
            questionText: q.questionText,
            questionType: q.questionType || 'multiple_choice',
            options: JSON.stringify(q.options), // Expecting array [{"id":"a", "text":"..."}]
            correctOption: q.correctOption,
            points: q.points || 1
          }
        }))
      );

      if (saveToBank) {
        await Promise.all(
          questions.map(q => tx.cBTQuestionBank.create({
            data: {
              schoolId: req.schoolId,
              teacherId: req.user.id,
              subjectId: exam.subjectId,
              classId: exam.classId,
              questionText: q.questionText,
              questionType: q.questionType || 'multiple_choice',
              options: JSON.stringify(q.options),
              correctOption: q.correctOption,
              points: q.points || 1
            }
          }))
        );
      }

      return examQuestions;
    });

    res.json(createdQuestions);

    // Log action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'CBT_QUESTIONS',
      details: {
        examId: examId,
        count: createdQuestions.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update a question
router.put('/:id/questions/:questionId', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const qId = parseInt(req.params.questionId);
    const { questionText, questionType, options, correctOption, points } = req.body;

    const updated = await prisma.cBTQuestion.update({
      where: { id: qId, schoolId: req.schoolId },
      data: {
        questionText,
        questionType,
        options: JSON.stringify(options),
        correctOption,
        points: parseFloat(points) || 1
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a single question
router.delete('/:id/questions/:questionId', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const qId = parseInt(req.params.questionId);
    await prisma.cBTQuestion.delete({
      where: { id: qId, schoolId: req.schoolId }
    });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish Exam (Admin/Principal/Teacher)
router.put('/:id/publish', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { isPublished } = req.body;

    const updatedExam = await prisma.cBTExam.update({
      where: {
        id: examId,
        schoolId: req.schoolId
      },
      data: { isPublished }
    });
    res.json(updatedExam);

    // Log action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'PUBLISH',
      resource: 'CBT_EXAM',
      details: {
        examId: examId,
        isPublished
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENT ROUTES ============

// Get Available Exams for Student
router.get('/student/available', authenticate, authorize(['student']), async (req, res) => {
  try {
    // Get student's class
    const student = await prisma.student.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: { classModel: true }
    });

    if (!student || !student.classId) {
      return res.json([]);
    }

    // Get current active term for the school
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });

    const availableExams = await prisma.cBTExam.findMany({
      where: {
        schoolId: req.schoolId,
        classId: student.classId,
        isPublished: true,
        termId: currentTerm?.id || undefined // Only show exams for current term
      },
      include: {
        Subject: true,
        CBTResult: {
          where: {
            studentId: student.id,
            schoolId: req.schoolId
          }
        }
      }
    });

    // Normalize for frontend compatibility
    const normalized = availableExams.map(e => ({
      ...e,
      subject: e.Subject,
      results: e.CBTResult,
      hasToken: !!e.token, // Return hasToken boolean securely
      token: undefined,    // Strip the secret token so students can't inspect it!
      Subject: undefined,
      CBTResult: undefined
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ QUESTION BANK ROUTES ============

// Upload Question Attachment (Images / Diagrams)
router.post('/bank/upload-attachment', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const attachmentUrl = await uploadFile(req.file, 'questions');
    res.json({ attachmentUrl });
  } catch (error) {
    console.error('Question attachment upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Questions from Bank
router.get('/bank', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { subjectId, teacherId, classId, questionType } = req.query;
    const where = { schoolId: req.schoolId };

    if (subjectId && !isNaN(parseInt(subjectId))) where.subjectId = parseInt(subjectId);
    if (classId && !isNaN(parseInt(classId))) where.classId = parseInt(classId);
    if (questionType && ['multiple_choice', 'essay'].includes(questionType)) {
      where.questionType = questionType;
    }

    // Teachers usually only see their own bank questions unless they are admin
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    } else if (teacherId && !isNaN(parseInt(teacherId))) {
      where.teacherId = parseInt(teacherId);
    }

    const questions = await prisma.cBTQuestionBank.findMany({
      where,
      include: {
        Subject: true,
        User: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize relation names for frontend compatibility
    const normalized = questions.map(q => ({
      ...q,
      subject: q.Subject,
      teacher: q.User,
      Subject: undefined,
      User: undefined
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Question bank fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add Single Question to Bank
router.post('/bank', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { subjectId, classId, questionText, questionType, options, correctOption, points } = req.body;

    const qType = questionType === 'essay' ? 'essay' : 'multiple_choice';

    if (!subjectId) return res.status(400).json({ error: 'Subject is required' });
    if (!questionText || !questionText.trim()) return res.status(400).json({ error: 'Question text is required' });
    
    if (qType === 'multiple_choice') {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'At least 2 options are required for multiple choice' });
      }
      if (!correctOption) return res.status(400).json({ error: 'Correct option is required for multiple choice' });
    }

    const formattedOptions = qType === 'essay'
      ? (typeof options === 'string' ? options : JSON.stringify(options || []))
      : (typeof options === 'string' ? options : JSON.stringify(options));

    const newBankQuestion = await prisma.cBTQuestionBank.create({
      data: {
        schoolId: req.schoolId,
        teacherId: req.user.id,
        subjectId: parseInt(subjectId),
        classId: classId ? parseInt(classId) : null,
        questionText: questionText.trim(),
        questionType: qType,
        options: formattedOptions,
        correctOption: qType === 'essay' ? 'essay' : (correctOption ? correctOption.toLowerCase() : 'a'),
        points: points ? parseFloat(points) : 1
      },
      include: {
        Subject: true,
        User: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const normalized = {
      ...newBankQuestion,
      subject: newBankQuestion.Subject,
      teacher: newBankQuestion.User,
      Subject: undefined,
      User: undefined
    };

    res.json(normalized);
  } catch (error) {
    console.error('Create bank question error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Question in Bank
router.put('/bank/:id', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid question ID' });

    const existing = await prisma.cBTQuestionBank.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Question not found' });

    if (req.user.role === 'teacher' && existing.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this question' });
    }

    const { subjectId, classId, questionText, questionType, options, correctOption, points } = req.body;
    const qType = questionType || existing.questionType || 'multiple_choice';

    const updated = await prisma.cBTQuestionBank.update({
      where: { id },
      data: {
        subjectId: subjectId ? parseInt(subjectId) : existing.subjectId,
        classId: classId !== undefined ? (classId ? parseInt(classId) : null) : existing.classId,
        questionText: questionText !== undefined ? questionText.trim() : existing.questionText,
        questionType: qType,
        options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : existing.options,
        correctOption: qType === 'essay' ? 'essay' : (correctOption ? correctOption.toLowerCase() : existing.correctOption),
        points: points !== undefined ? parseFloat(points) : existing.points
      },
      include: {
        Subject: true,
        User: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const normalized = {
      ...updated,
      subject: updated.Subject,
      teacher: updated.User,
      Subject: undefined,
      User: undefined
    };

    res.json(normalized);

  } catch (error) {
    console.error('Update bank question error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk Upload to Question Bank
router.post('/bank/upload', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { subjectId, classId } = req.body;

    if (!subjectId) return res.status(400).json({ error: 'Subject is required' });

    const workbook = new ExcelJS.Workbook();
    let rows = [];

    if (req.file.originalname.endsWith('.csv')) {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(req.file.buffer);
    }

    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    // Question Bank download has different headers, but upload should follow Template
    const expectedHeaders = ['Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option'];
    const actualHeaders = [
      headerRow.getCell(1).value?.toString() || '',
      headerRow.getCell(2).value?.toString() || '',
      headerRow.getCell(3).value?.toString() || '',
      headerRow.getCell(4).value?.toString() || '',
      headerRow.getCell(5).value?.toString() || '',
      headerRow.getCell(6).value?.toString() || ''
    ];

    const isValidHeader = expectedHeaders.every((h, i) => actualHeaders[i].toLowerCase().includes(h.toLowerCase()));
    if (!isValidHeader) {
      return res.status(400).json({ error: 'Invalid file format. Please use the correct CBT Questions Template.' });
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const questionText = row.getCell(1).value?.toString()?.trim();
      const optA = row.getCell(2).value?.toString()?.trim();
      const optB = row.getCell(3).value?.toString()?.trim();
      const optC = row.getCell(4).value?.toString()?.trim();
      const optD = row.getCell(5).value?.toString()?.trim();
      const correct = row.getCell(6).value?.toString()?.trim()?.toLowerCase();
      const points = parseFloat(row.getCell(7).value) || 1;

      if (questionText && optA && optB && optC && optD && correct) {
        // Validate correct option
        if (!['a', 'b', 'c', 'd'].includes(correct)) return;

        rows.push({
          questionText,
          options: JSON.stringify([
            { id: 'a', text: optA },
            { id: 'b', text: optB },
            { id: 'c', text: optC },
            { id: 'd', text: optD }
          ]),
          correctOption: correct,
          points
        });
      }
    });

    if (rows.length === 0) return res.status(400).json({ error: 'No valid questions found in file' });

    // Transaction to create bank questions
    const createdQuestions = await prisma.$transaction(
      rows.map(q => prisma.cBTQuestionBank.create({
        data: {
          schoolId: req.schoolId,
          teacherId: req.user.id,
          subjectId: parseInt(subjectId),
          classId: classId ? parseInt(classId) : null,
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          points: q.points
        }
      }))
    );

    res.json({ message: `Successfully added ${createdQuestions.length} questions to bank`, count: createdQuestions.length });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'IMPORT',
      resource: 'CBT_BANK',
      details: { subjectId, count: createdQuestions.length },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Bank upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download Question Bank (CSV) - Admin/Principal only for all, teachers for theirs
router.get('/bank/download', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { subjectId } = req.query;
    const where = { schoolId: req.schoolId };
    if (subjectId && !isNaN(parseInt(subjectId))) where.subjectId = parseInt(subjectId);
    if (req.user.role === 'teacher') where.teacherId = req.user.id;

    const questions = await prisma.cBTQuestionBank.findMany({
      where,
      include: { Subject: true, User: true }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Question Bank');

    worksheet.columns = [
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Question Text', key: 'questionText', width: 50 },
      { header: 'Option A', key: 'a', width: 25 },
      { header: 'Option B', key: 'b', width: 25 },
      { header: 'Option C', key: 'c', width: 25 },
      { header: 'Option D', key: 'd', width: 25 },
      { header: 'Correct Option', key: 'correctOption', width: 15 },
      { header: 'Points', key: 'points', width: 10 },
      { header: 'Created By', key: 'teacher', width: 20 }
    ];

    questions.forEach(q => {
      let opts = [];
      let guide = '';
      try {
        if (typeof q.options === 'string') {
          const parsed = JSON.parse(q.options);
          if (Array.isArray(parsed)) opts = parsed;
          else if (parsed && typeof parsed === 'object') guide = parsed.markingGuide || '';
        } else if (Array.isArray(q.options)) {
          opts = q.options;
        } else if (q.options && typeof q.options === 'object') {
          guide = q.options.markingGuide || '';
        }
      } catch (e) {}

      const isEssay = q.questionType === 'essay';

      worksheet.addRow({
        subject: q.Subject?.name || 'N/A',
        questionText: q.questionText,
        a: isEssay ? (guide ? `[Marking Guide]: ${guide}` : 'Theory / Essay Paper') : (Array.isArray(opts) ? opts.find(o => o.id === 'a')?.text || '' : ''),
        b: isEssay ? '' : (Array.isArray(opts) ? opts.find(o => o.id === 'b')?.text || '' : ''),
        c: isEssay ? '' : (Array.isArray(opts) ? opts.find(o => o.id === 'c')?.text || '' : ''),
        d: isEssay ? '' : (Array.isArray(opts) ? opts.find(o => o.id === 'd')?.text || '' : ''),
        correctOption: q.correctOption,
        points: q.points,
        teacher: q.User ? `${q.User.firstName} ${q.User.lastName}` : 'Unknown'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=CBT_Question_Bank.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Bank download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete Questions by Subject from Bank
// IMPORTANT: This must come BEFORE /bank/:id to prevent Express matching 'subject' as an id
router.delete('/bank/subject/:subjectId', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    if (isNaN(subjectId)) return res.status(400).json({ error: 'Invalid subject ID' });

    const where = {
      schoolId: req.schoolId,
      subjectId: subjectId
    };

    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    }

    const { count } = await prisma.cBTQuestionBank.deleteMany({ where });
    res.json({ message: `Successfully deleted ${count} questions from bank`, count });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'CBT_BANK_SUBJECT',
      details: { subjectId, count },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Bulk delete by subject error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Question from Bank
router.delete('/bank/:id', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid question ID' });

    const question = await prisma.cBTQuestionBank.findUnique({ where: { id } });

    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (req.user.role === 'teacher' && question.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.cBTQuestionBank.delete({ where: { id } });
    res.json({ message: 'Question deleted from bank' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Exam (Admin/Principal/Teacher)
router.delete('/:id', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    await prisma.cBTExam.delete({
      where: {
        id: examId,
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Exam deleted' });

    // Log action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'CBT_EXAM',
      details: {
        examId: examId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Exam Details (with questions for teacher)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      },
      include: {
        CBTQuestion: {
          where: { schoolId: req.schoolId }
        },
        Class: true,
        Subject: true
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Normalize relation names for frontend
    const normalizedExam = {
      ...exam,
      questions: exam.CBTQuestion,
      class: exam.Class,
      subject: exam.Subject,
      CBTQuestion: undefined,
      Class: undefined,
      Subject: undefined
    };

    // Authorization check
    if (req.user.role === 'student') {
      // Check if student belongs to class
      // Check if exam is published
      if (!normalizedExam.isPublished) return res.status(403).json({ error: 'Exam not published' });

      // Check Access Token
      if (normalizedExam.token && normalizedExam.token.trim() !== '') {
        const providedToken = req.query.token || req.headers['x-exam-token'];
        if (!providedToken || providedToken.trim().toLowerCase() !== normalizedExam.token.trim().toLowerCase()) {
          return res.status(403).json({ 
            error: 'token_required', 
            message: 'Invalid or missing Exam Access Token. Please enter the correct token from the invigilator.' 
          });
        }
      }

      // Check Timing
      const now = new Date();
      if (normalizedExam.startDate && new Date(normalizedExam.startDate) > now) {
        return res.status(403).json({ error: `Exam starts at ${new Date(normalizedExam.startDate).toLocaleString()}` });
      }
      if (normalizedExam.endDate && new Date(normalizedExam.endDate) < now) {
        return res.status(403).json({ error: 'Exam has ended and is no longer accessible' });
      }

      // Return without correctOption and token
      const studentExam = {
        ...normalizedExam,
        token: undefined, // Strip secret token from payload
        questions: normalizedExam.questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options, // It's a string, frontend parses
          questionType: q.questionType,
          points: q.points
          // correctOption REMOVED
        }))
      };
      return res.json(studentExam);
    }

    res.json(normalizedExam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Exam Results (Teacher/Admin/Principal View)
router.get('/:id/results', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    // Verify ownership/access
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      },
      include: { Class: true, Subject: true }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = await prisma.cBTResult.findMany({
      where: {
        examId,
        schoolId: req.schoolId
      },
      include: {
        Student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                schoolId: true
              }
            }
          }
        }
      },
      orderBy: { score: 'desc' }
    });

    // Normalize
    const normalizedExam = { ...exam, class: exam.Class, subject: exam.Subject, Class: undefined, Subject: undefined };
    const normalizedResults = results.map(r => ({ ...r, student: r.Student, Student: undefined }));

    res.json({ exam: normalizedExam, results: normalizedResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download Exam Results (CSV - Admin/Principal/Teacher)
router.get('/:id/results/download', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    const [exam, schoolSettings] = await Promise.all([
      prisma.cBTExam.findFirst({
        where: { id: examId, schoolId: req.schoolId },
        include: {
          Class: true,
          Subject: true,
          AcademicSession: true,
          Term: true,
          School: true
        }
      }),
      prisma.school.findUnique({
        where: { id: req.schoolId }
      })
    ]);

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = await prisma.cBTResult.findMany({
      where: { examId, schoolId: req.schoolId },
      include: {
        Student: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { score: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CBT Results');

    const schoolName = schoolSettings?.name || exam.School?.name || 'SCHOOL MANAGEMENT SYSTEM';
    const examTitle = exam.title || 'CBT Assessment';
    const subjectName = exam.Subject?.name || 'N/A';
    const className = exam.Class?.name || 'N/A';
    const termName = exam.Term?.name || 'N/A';
    const sessionName = exam.AcademicSession?.name || 'N/A';

    // 1. School Header Row (Row 1)
    const titleRow = worksheet.addRow([schoolName.toUpperCase()]);
    worksheet.mergeCells('A1:K1');
    titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleRow.height = 36;

    // 2. Subheader Row (Row 2)
    const subTitleRow = worksheet.addRow(['CBT EXAMINATION & ASSESSMENT RESULTS REPORT']);
    worksheet.mergeCells('A2:K2');
    subTitleRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
    subTitleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    subTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    subTitleRow.height = 24;

    // 3. Blank Row (Row 3)
    worksheet.addRow([]);

    // 4. Metadata Block (Rows 4 - 6)
    const totalQCount = results[0]?.totalQuestions || exam.totalMarks || 'N/A';
    worksheet.addRow(['Exam Title:', examTitle, '', 'Academic Session:', sessionName, '', 'Total Questions:', totalQCount]);
    worksheet.addRow(['Subject Name:', subjectName, '', 'Term:', termName, '', 'Time Allowed:', `${exam.durationMinutes || 60} Minutes`]);
    worksheet.addRow(['Class Level:', className, '', 'Total Candidates:', results.length, '', 'Total Obtainable Score:', exam.totalMarks || 100]);

    // Style Metadata block
    for (let r = 4; r <= 6; r++) {
      const row = worksheet.getRow(r);
      row.font = { name: 'Calibri', size: 10 };
      [1, 4, 7].forEach(colIdx => {
        const cell = row.getCell(colIdx);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
      });
      [2, 5, 8].forEach(colIdx => {
        const cell = row.getCell(colIdx);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      });
    }

    // 5. Statistics Summary Box Header (Row 7 to 9)
    worksheet.addRow([]); // Row 7 blank
    
    const totalCandidates = results.length;
    const scoresArr = results.map(r => r.score);
    const avgScore = totalCandidates > 0 ? (scoresArr.reduce((a, b) => a + b, 0) / totalCandidates).toFixed(1) : 0;
    const maxScore = totalCandidates > 0 ? Math.max(...scoresArr) : 0;
    const minScore = totalCandidates > 0 ? Math.min(...scoresArr) : 0;
    const passCount = results.filter(r => (exam.totalMarks > 0 ? (r.score / exam.totalMarks) >= 0.5 : r.score >= 50)).length;
    const failCount = totalCandidates - passCount;

    const statsHeader = worksheet.addRow(['EXAM PERFORMANCE SUMMARY']);
    worksheet.mergeCells('A9:K9');
    statsHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    statsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
    statsHeader.height = 22;

    const statsRow = worksheet.addRow([
      `Candidates: ${totalCandidates}`,
      `Class Avg: ${avgScore}`,
      `Highest Score: ${maxScore}`,
      `Lowest Score: ${minScore}`,
      `Pass Rate: ${totalCandidates > 0 ? ((passCount / totalCandidates) * 100).toFixed(1) : 0}% (${passCount} Passed / ${failCount} Failed)`
    ]);
    worksheet.mergeCells('E10:K10');
    statsRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };

    worksheet.addRow([]); // Row 11 blank

    // 6. Data Table Headers (Row 12)
    const tableHeaderRow = worksheet.addRow([
      'S/N',
      'Student Name',
      'Admission Number',
      'Total Questions',
      'Passed (Correct)',
      'Failed (Incorrect)',
      'Unattempted (Skipped)',
      'Score Obtained',
      'Percentage (%)',
      'Time Taken',
      'Submission Date & Time'
    ]);

    tableHeaderRow.height = 28;
    tableHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    // 7. Add Data Rows (Row 13+)
    results.forEach((r, index) => {
      const studentName = r.Student?.user 
        ? `${r.Student.user.firstName} ${r.Student.user.lastName}` 
        : (r.Student?.name || 'N/A');
      const admissionNum = r.Student?.admissionNumber || 'N/A';
      
      const totalQ = r.totalQuestions || 0;
      const correctQ = r.correctAnswers || 0;

      // Parse answers to compute attempted vs unattempted
      let attemptedCount = correctQ;
      if (r.answers) {
        try {
          const parsed = JSON.parse(r.answers);
          if (parsed && typeof parsed === 'object') {
            attemptedCount = Object.keys(parsed).filter(k => parsed[k] !== undefined && parsed[k] !== null && parsed[k] !== '').length;
          }
        } catch (e) {}
      } else {
        attemptedCount = totalQ;
      }

      const unattemptedQ = Math.max(0, totalQ - attemptedCount);
      const failedQ = Math.max(0, attemptedCount - correctQ);

      const percentage = exam.totalMarks > 0 ? ((r.score / exam.totalMarks) * 100).toFixed(2) : '0.00';

      // Compute Total Time Taken
      let timeTakenStr = 'N/A';
      if (r.startedAt && r.submittedAt) {
        const start = new Date(r.startedAt).getTime();
        const end = new Date(r.submittedAt).getTime();
        const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
        if (diffSecs > 0) {
          const m = Math.floor(diffSecs / 60);
          const s = diffSecs % 60;
          timeTakenStr = `${m}m ${s < 10 ? '0' : ''}${s}s`;
        }
      }

      const subDateStr = r.submittedAt 
        ? new Date(r.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : 'N/A';

      const row = worksheet.addRow([
        index + 1,
        studentName,
        admissionNum,
        totalQ,
        correctQ,
        failedQ,
        unattemptedQ,
        r.score,
        `${percentage}%`,
        timeTakenStr,
        subDateStr
      ]);

      row.height = 20;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNumber === 1 || colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 10, bold: true };
        } else if (colNumber >= 4 && colNumber <= 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (colNumber === 5) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF16A34A' } };
          if (colNumber === 6) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FADC2626' } };
          if (colNumber === 7) cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
          if (colNumber === 8) cell.font = { name: 'Calibri', size: 10, bold: true };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // Set Column Widths
    worksheet.columns = [
      { key: 'sn', width: 6 },
      { key: 'name', width: 28 },
      { key: 'adm', width: 18 },
      { key: 'totalQ', width: 15 },
      { key: 'passedQ', width: 18 },
      { key: 'failedQ', width: 18 },
      { key: 'unattemptedQ', width: 22 },
      { key: 'score', width: 15 },
      { key: 'percentage', width: 15 },
      { key: 'timeTaken', width: 15 },
      { key: 'submissionDate', width: 24 }
    ];

    const safeExamTitle = exam.title.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_') || 'Exam';
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="CBT_Results_${safeExamTitle}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('CBT Results download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import CBT scores into student results (Admin/Principal/Teacher)
router.post('/:id/results/import', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    // 1. Get Exam, Results and School Settings
    const [exam, schoolSettings] = await Promise.all([
      prisma.cBTExam.findFirst({
        where: { id: examId, schoolId: req.schoolId },
        include: {
          CBTResult: { where: { schoolId: req.schoolId } }
        }
      }),
      prisma.school.findUnique({
        where: { id: req.schoolId },
        select: { gradingSystem: true }
      })
    ]);

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!exam.CBTResult || exam.CBTResult.length === 0) {
      return res.status(400).json({ error: 'No results found to import' });
    }

    const examType = exam.examType || 'examination';
    let targetField = 'examScore';
    if (examType === 'test1' || examType === 'first_test') targetField = 'test1Score';
    else if (examType === 'test2' || examType === 'second_test') targetField = 'test2Score';
    else if (examType === 'assignment1') targetField = 'assignment1Score';
    else if (examType === 'assignment2') targetField = 'assignment2Score';

    // 2. Import each result
    const importResults = await Promise.all(exam.CBTResult.map(async (cbtRes) => {
      // Find existing result record
      const existing = await prisma.result.findUnique({
        where: {
          schoolId_studentId_subjectId_termId_academicSessionId: {
            schoolId: req.schoolId,
            studentId: cbtRes.studentId,
            subjectId: exam.subjectId,
            termId: exam.termId,
            academicSessionId: exam.academicSessionId
          }
        }
      });

      const score = cbtRes.score;
      const data = { [targetField]: score };

      if (existing) {
        // Update existing record and recalculate total
        const updatedScores = {
          assignment1Score: existing.assignment1Score,
          assignment2Score: existing.assignment2Score,
          test1Score: existing.test1Score,
          test2Score: existing.test2Score,
          examScore: existing.examScore,
          ...data
        };

        const totalScore = calculateTotalScore(
          updatedScores.assignment1Score,
          updatedScores.assignment2Score,
          updatedScores.test1Score,
          updatedScores.test2Score,
          updatedScores.examScore
        );

        return prisma.result.update({
          where: { id: existing.id },
          data: {
            ...data,
            totalScore,
            grade: getGrade(totalScore, schoolSettings.gradingSystem)
          }
        });
      } else {
        // Create new record
        const totalScore = score; // Only one component so far
        return prisma.result.create({
          data: {
            schoolId: req.schoolId,
            studentId: cbtRes.studentId,
            classId: exam.classId,
            subjectId: exam.subjectId,
            termId: exam.termId,
            academicSessionId: exam.academicSessionId,
            ...data,
            totalScore,
            grade: getGrade(totalScore, schoolSettings.gradingSystem),
            teacherId: req.user.id
          }
        });
      }
    }));

    // 3. Recalculate class averages and positions
    await calculateClassAverage(prisma, exam.classId, exam.subjectId, exam.termId, req.schoolId);
    await calculatePositions(prisma, exam.classId, exam.subjectId, exam.termId, req.schoolId);

    res.json({ message: `Successfully imported ${importResults.length} scores into academic records`, count: importResults.length });

    // Log action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'IMPORT',
      resource: 'CBT_TO_RESULTS',
      details: {
        examId: examId,
        count: importResults.length,
        type: examType
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Import questions from bank to exam
router.post('/:id/import-from-bank', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { questionIds } = req.body;

    // Verify exam exists and belongs to school
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Verify ownership for teachers
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to add questions to this exam' });
    }

    // Get bank questions
    const bankQuestions = await prisma.cBTQuestionBank.findMany({
      where: {
        id: { in: questionIds.map(id => parseInt(id)) },
        schoolId: req.schoolId
      }
    });

    if (bankQuestions.length === 0) {
      return res.status(400).json({ error: 'No valid bank questions found' });
    }

    // Add to exam questions
    const createdQuestions = await prisma.$transaction(
      bankQuestions.map(bq => prisma.cBTQuestion.create({
        data: {
          schoolId: req.schoolId,
          examId,
          questionText: bq.questionText,
          questionType: bq.questionType || 'multiple_choice',
          options: bq.options,
          correctOption: bq.correctOption,
          points: bq.points || 1
        }
      }))
    );

    res.json({
      message: `Successfully imported ${createdQuestions.length} questions from bank`,
      count: createdQuestions.length
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'IMPORT',
      resource: 'CBT_QUESTIONS',
      details: {
        examId: examId,
        source: 'QUESTION_BANK',
        count: createdQuestions.length
      },
      ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Exam
router.post('/:id/submit', authenticate, authorize(['student']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { answers, startedAt, durationSeconds } = req.body; // { questionId: selectedOptionId }

    const student = await prisma.student.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      }
    });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    // Check if already attempted
    const existing = await prisma.cBTResult.findUnique({
      where: {
        schoolId_examId_studentId: {
          schoolId: req.schoolId,
          examId,
          studentId: student.id
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already submitted this exam and cannot retake it.' });
    }

    // load exam and questions
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      },
      include: {
        CBTQuestion: {
          where: { schoolId: req.schoolId }
        }
      }
    });

    // Calculate score
    let score = 0;
    let correctCount = 0;

    const examQuestions = exam.CBTQuestion || [];
    examQuestions.forEach(q => {
      const studentAnswer = answers ? answers[q.id] : undefined;
      if (studentAnswer === q.correctOption) {
        score += q.points;
        correctCount++;
      }
    });

    let startTimeDate = new Date();
    if (startedAt) {
      startTimeDate = new Date(startedAt);
    } else if (durationSeconds) {
      startTimeDate = new Date(Date.now() - (parseInt(durationSeconds) * 1000));
    }

    // Save result
    const result = await prisma.cBTResult.create({
      data: {
        schoolId: req.schoolId,
        examId,
        studentId: student.id,
        score,
        totalQuestions: examQuestions.length,
        correctAnswers: correctCount,
        answers: JSON.stringify(answers || {}),
        startedAt: startTimeDate,
        submittedAt: new Date()
      }
    });

    res.json(result);

    // Log submission
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SUBMIT',
      resource: 'CBT_EXAM',
      details: {
        examId: examId,
        studentId: student.id,
        score: score,
        total: examQuestions.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a Result (Admin/Principal/Teacher)
router.delete('/results/:id', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const resultId = parseInt(req.params.id);

    // Verify ownership/permission
    const result = await prisma.cBTResult.findUnique({
      where: { id: resultId },
      include: { CBTExam: true }
    });

    if (!result) return res.status(404).json({ error: 'Result not found' });

    if (req.user.role === 'teacher' && result.CBTExam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this result' });
    }

    await prisma.cBTResult.delete({
      where: { id: resultId }
    });

    res.json({ message: 'Result deleted' });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'CBT_RESULT',
      details: { resultId },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
