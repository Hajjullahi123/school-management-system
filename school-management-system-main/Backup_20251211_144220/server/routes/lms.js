const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// ============ HOMEWORK ============

// Get Homework for a specific class (Student/Teacher)
router.get('/homework/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const homeworks = await prisma.homework.findMany({
      where: { classId: parseInt(classId) },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(homeworks);
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Create Homework (Teacher Only)
router.post('/homework', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { classId, subjectId, title, description, dueDate } = req.body;

    const homework = await prisma.homework.create({
      data: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(homework);
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// Delete Homework (Teacher/Admin)
router.delete('/homework/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Check ownership if teacher
    if (req.user.role === 'teacher') {
      const hw = await prisma.homework.findUnique({ where: { id: parseInt(id) } });
      if (!hw || hw.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    await prisma.homework.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ============ LEARNING RESOURCES ============

// Get Resources for a class
router.get('/resources/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { type } = req.query; // Optional filter by type

    const where = { classId: parseInt(classId) };
    if (type) where.type = type;

    const resources = await prisma.learningResource.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Create Resource (Teacher)
router.post('/resources', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { classId, subjectId, title, description, fileUrl, type } = req.body;

    // Note: fileUrl would normally come from an upload middleware. 
    // For now we assume the frontend handles upload and sends the URL, or it's just a link.

    const resource = await prisma.learningResource.create({
      data: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        title,
        description,
        fileUrl,
        type // 'note', 'past_question', etc.
      }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
