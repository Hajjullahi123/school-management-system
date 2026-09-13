const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get results (optionally filtered by student)
router.get('/', async (req, res) => {
  try {
    const { studentId, examId } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (examId) where.examId = parseInt(examId);

    const results = await prisma.result.findMany({
      where,
      include: {
        student: true,
        subject: true,
        exam: true
      }
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add/Update result
router.post('/', async (req, res) => {
  try {
    const { studentId, subjectId, examId, marks } = req.body;

    // Upsert to handle both create and update
    const result = await prisma.result.upsert({
      where: {
        studentId_subjectId_examId: {
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          examId: parseInt(examId)
        }
      },
      update: { marks: parseFloat(marks) },
      create: {
        studentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        examId: parseInt(examId),
        marks: parseFloat(marks)
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
