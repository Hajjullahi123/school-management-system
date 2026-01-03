const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all assignments
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicSessionId } = req.query;

    const where = {};
    if (classId) where.classId = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (academicSessionId) where.academicSessionId = parseInt(academicSessionId);

    const assignments = await prisma.classSubjectTeacher.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        academicSession: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Create assignment (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicSessionId } = req.body;

    if (!classId || !subjectId || !teacherId || !academicSessionId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.classSubjectTeacher.findUnique({
      where: {
        classId_subjectId_academicSessionId: {
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Assignment already exists for this class, subject and session' });
    }

    const assignment = await prisma.classSubjectTeacher.create({
      data: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: parseInt(teacherId),
        academicSessionId: parseInt(academicSessionId)
      },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        academicSession: true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Delete assignment (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.classSubjectTeacher.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

module.exports = router;
