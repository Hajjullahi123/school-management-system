const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { calculateTotalScore, getGrade, calculateClassAverage, calculatePositions } = require('../utils/grading');
const multer = require('multer');
const ExcelJS = require('exceljs');
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
      details: { examId, count: createdQuestions.length },
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
        class: true,
        subject: true,
        _count: {
          select: {
            questions: { where: { schoolId: req.schoolId } },
            results: { where: { schoolId: req.schoolId } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(exams);
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
      examType, randomizeQuestions, randomizeOptions
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
        examType: examType || 'examination'
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
      examType, randomizeQuestions, randomizeOptions
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
        randomizeOptions: randomizeOptions !== undefined ? !!randomizeOptions : undefined
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
        subject: true,
        results: {
          where: {
            studentId: student.id,
            schoolId: req.schoolId
          }
        }
      }
    });

    res.json(availableExams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ QUESTION BANK ROUTES ============

// Get Questions from Bank
router.get('/bank', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const { subjectId, teacherId, classId } = req.query;
    const where = { schoolId: req.schoolId };

    if (subjectId) where.subjectId = parseInt(subjectId);
    if (classId) where.classId = parseInt(classId);

    // Teachers usually only see their own bank questions unless they are admin
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    } else if (teacherId) {
      where.teacherId = parseInt(teacherId);
    }

    const questions = await prisma.cBTQuestionBank.findMany({
      where,
      include: {
        subject: true,
        teacher: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(questions);
  } catch (error) {
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
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (req.user.role === 'teacher') where.teacherId = req.user.id;

    const questions = await prisma.cBTQuestionBank.findMany({
      where,
      include: { subject: true, teacher: true }
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
      const opts = JSON.parse(q.options);
      worksheet.addRow({
        subject: q.subject.name,
        questionText: q.questionText,
        a: opts.find(o => o.id === 'a')?.text,
        b: opts.find(o => o.id === 'b')?.text,
        c: opts.find(o => o.id === 'c')?.text,
        d: opts.find(o => o.id === 'd')?.text,
        correctOption: q.correctOption,
        points: q.points,
        teacher: `${q.teacher.firstName} ${q.teacher.lastName}`
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=CBT_Question_Bank.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Question from Bank
router.delete('/bank/:id', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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

// Bulk Delete Questions by Subject from Bank
router.delete('/bank/subject/:subjectId', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
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
        questions: {
          where: { schoolId: req.schoolId }
        },
        class: true,
        subject: true
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Authorization check
    if (req.user.role === 'student') {
      // Check if student belongs to class
      // Check if exam is published
      if (!exam.isPublished) return res.status(403).json({ error: 'Exam not published' });

      // Check Timing
      const now = new Date();
      if (exam.startDate && new Date(exam.startDate) > now) {
        return res.status(403).json({ error: `Exam starts at ${new Date(exam.startDate).toLocaleString()}` });
      }
      if (exam.endDate && new Date(exam.endDate) < now) {
        return res.status(403).json({ error: 'Exam has ended and is no longer accessible' });
      }

      // Return without correctOption
      const studentExam = {
        ...exam,
        questions: exam.questions.map(q => ({
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

    res.json(exam);
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
      include: { class: true, subject: true }
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
        student: {
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

    res.json({ exam, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download Exam Results (CSV - Admin/Principal/Teacher)
router.get('/:id/results/download', authenticate, authorize(['superadmin', 'admin', 'teacher', 'principal', 'examination_officer']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    const exam = await prisma.cBTExam.findFirst({
      where: { id: examId, schoolId: req.schoolId },
      include: { class: true, subject: true }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = await prisma.cBTResult.findMany({
      where: { examId, schoolId: req.schoolId },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { score: 'desc' }
    });

    // Generate CSV
    const headers = ['Student Name', 'Admission Number', 'Score', 'Total Questions', 'Correct Answers', 'Percentage', 'Submission Date'];
    const rows = results.map(r => {
      const name = r.student.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : (r.student.name || r.student.admissionNumber || 'Student');
      const percentage = exam.totalMarks > 0 ? ((r.score / exam.totalMarks) * 100).toFixed(2) : 0;
      return [
        name,
        r.student.admissionNumber,
        r.score,
        r.totalQuestions,
        r.correctAnswers,
        `${percentage}%`,
        new Date(r.submittedAt).toLocaleString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=CBT_Results_${exam.title.replace(/\s+/g, '_')}.csv`);
    res.send(csvContent);

  } catch (error) {
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
          results: { where: { schoolId: req.schoolId } }
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

    if (!exam.results || exam.results.length === 0) {
      return res.status(400).json({ error: 'No results found to import' });
    }

    const examType = exam.examType || 'examination';
    let targetField = 'examScore';
    if (examType === 'test1' || examType === 'first_test') targetField = 'test1Score';
    else if (examType === 'test2' || examType === 'second_test') targetField = 'test2Score';
    else if (examType === 'assignment1') targetField = 'assignment1Score';
    else if (examType === 'assignment2') targetField = 'assignment2Score';

    // 2. Import each result
    const importResults = await Promise.all(exam.results.map(async (cbtRes) => {
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
    const { answers } = req.body; // { questionId: selectedOptionId }

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
        questions: {
          where: { schoolId: req.schoolId }
        }
      }
    });

    // Calculate score
    let score = 0;
    let correctCount = 0;

    exam.questions.forEach(q => {
      const studentAnswer = answers[q.id];
      if (studentAnswer === q.correctOption) {
        score += q.points;
        correctCount++;
      }
    });

    // Save result
    const result = await prisma.cBTResult.create({
      data: {
        schoolId: req.schoolId,
        examId,
        studentId: student.id,
        score,
        totalQuestions: exam.questions.length,
        correctAnswers: correctCount,
        answers: JSON.stringify(answers),
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
        total: exam.questions.length
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
      include: { exam: true }
    });

    if (!result) return res.status(404).json({ error: 'Result not found' });

    if (req.user.role === 'teacher' && result.exam.teacherId !== req.user.id) {
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
