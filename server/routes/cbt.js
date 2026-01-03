const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { calculateTotalScore, getGrade, calculateClassAverage, calculatePositions } = require('../utils/grading');

// ============ TEACHER ROUTES ============

// Get all exams created by teacher or all for admin
router.get('/teacher', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const where = { schoolId: req.schoolId };
    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
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

// Create Exam
router.post('/', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      title, description, classId, subjectId,
      durationMinutes, totalMarks, startDate, endDate,
      examType
    } = req.body;

    // Validation for teachers
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          schoolId: req.schoolId,
          teacherId: req.user.id,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId)
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
        examType: examType || 'examination'
      }
    });

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Questions to Exam
router.post('/:id/questions', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const { questions } = req.body; // Array of questions

    // Verify ownership
    const exam = await prisma.cBTExam.findFirst({
      where: {
        id: examId,
        schoolId: req.schoolId
      }
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Wrap in transaction
    const createdQuestions = await prisma.$transaction(
      questions.map(q => prisma.cBTQuestion.create({
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

// Publish Exam
router.put('/:id/publish', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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

// Delete Exam
router.delete('/:id', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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
      // Don't return correct answers!
      if (!exam.isPublished) return res.status(403).json({ error: 'Exam not published' });

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

// Get Exam Results (Teacher View)
router.get('/:id/results', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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

// Download Exam Results (CSV)
router.get('/:id/results/download', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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
      const name = `${r.student.user.firstName} ${r.student.user.lastName}`;
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

// Import CBT scores into student results
router.post('/:id/results/import', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    // 1. Get Exam and Results
    const exam = await prisma.cBTExam.findFirst({
      where: { id: examId, schoolId: req.schoolId },
      include: {
        results: { where: { schoolId: req.schoolId } }
      }
    });

    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (req.user.role === 'teacher' && exam.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!exam.results || exam.results.length === 0) {
      return res.status(400).json({ error: 'No results found to import' });
    }

    const examType = exam.examType || 'examination';
    let targetField = 'examScore';
    if (examType === 'first_test') targetField = 'test1Score';
    else if (examType === 'second_test') targetField = 'test2Score';

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
            grade: getGrade(totalScore)
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
            grade: getGrade(totalScore),
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
    console.error('Import error:', error);
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

    const availableExams = await prisma.cBTExam.findMany({
      where: {
        schoolId: req.schoolId,
        classId: student.classId,
        isPublished: true,
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
    // const existing = await prisma.cBTResult.findUnique({ where: { examId_studentId: { examId, studentId: student.id } }});
    // if (existing) return res.status(400).json({ error: 'Already submitted' });

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

module.exports = router;
