const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get results (optionally filtered by student)
router.get('/', authenticate, async (req, res) => {
  try {
    const { studentId, examId } = req.query;
    const where = {
      schoolId: req.schoolId
    };
    if (studentId) where.studentId = parseInt(studentId);
    if (examId) where.examId = parseInt(examId);

    const results = await prisma.result.findMany({
      where,
      include: {
        student: {
          where: { schoolId: req.schoolId }
        },
        subject: {
          where: { schoolId: req.schoolId }
        },
        exam: {
          where: { schoolId: req.schoolId }
        }
      }
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add/Update result
router.post('/', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId, subjectId, examId, marks } = req.body;

    // Upsert to handle both create and update
    const result = await prisma.result.upsert({
      where: {
        schoolId_studentId_subjectId_examId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          examId: parseInt(examId)
        }
      },
      update: { marks: parseFloat(marks) },
      create: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        examId: parseInt(examId),
        marks: parseFloat(marks)
      }
    });
    res.json(result);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPSERT',
      resource: 'RESULT',
      details: {
        studentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        examId: parseInt(examId),
        marks: parseFloat(marks)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
