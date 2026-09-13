const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get all exams
router.get('/', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create exam
router.post('/', async (req, res) => {
  try {
    const { name, date } = req.body;
    const exam = await prisma.exam.create({
      data: {
        name,
        date: new Date(date)
      }
    });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
