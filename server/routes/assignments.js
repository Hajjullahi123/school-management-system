const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all assignments
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicSessionId } = req.query;

    const where = { schoolId: req.schoolId };
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
        schoolId_classId_subjectId_academicSessionId: {
          schoolId: req.schoolId,
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
        schoolId: req.schoolId,
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

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE_ASSIGNMENT',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        assignmentId: assignment.id,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: parseInt(teacherId)
      },
      ipAddress: req.ip
    });
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
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Assignment deleted successfully' });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE_ASSIGNMENT',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        assignmentId: parseInt(id)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

module.exports = router;
