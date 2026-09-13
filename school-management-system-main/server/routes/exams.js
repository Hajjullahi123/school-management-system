const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all exams
router.get('/', authenticate, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { date: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create exam
router.post('/', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { name, date } = req.body;
    const exam = await prisma.exam.create({
      data: {
        schoolId: req.schoolId,
        name,
        date: new Date(date)
      }
    });
    res.json(exam);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'EXAM',
      details: {
        examId: exam.id,
        name: exam.name
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
