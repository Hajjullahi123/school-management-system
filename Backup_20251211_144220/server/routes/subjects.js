const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create subject
router.post('/', async (req, res) => {
  try {
    const { name, code } = req.body;
    const subject = await prisma.subject.create({
      data: { name, code }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
