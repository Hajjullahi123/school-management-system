const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// ============ HOMEWORK ============

// Get Homework for a specific class (Student/Teacher)
router.get('/homework/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    const homeworks = await prisma.homework.findMany({
      where: {
        classId: parseInt(classId),
        schoolId: req.schoolId
      },
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
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(homework);

    // Log homework creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'HOMEWORK',
      details: {
        homeworkId: homework.id,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        title: title
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// Delete Homework (Teacher/Admin)
router.delete('/homework/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Check ownership/school if teacher
    if (req.user.role === 'teacher') {
      const hw = await prisma.homework.findFirst({
        where: {
          id: parseInt(id),
          schoolId: req.schoolId
        }
      });
      if (!hw || hw.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    await prisma.homework.delete({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });
    res.json({ message: 'Deleted' });

    // Log homework deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'HOMEWORK',
      details: {
        homeworkId: parseInt(id)
      },
      ipAddress: req.ip
    });
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
      where: {
        ...where,
        schoolId: req.schoolId
      },
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
        schoolId: req.schoolId,
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

    // Log resource creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'LEARNING_RESOURCE',
      details: {
        resourceId: resource.id,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        title: title,
        type: type
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
