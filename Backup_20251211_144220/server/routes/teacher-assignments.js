const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all teacher assignments
router.get('/', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            arm: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignments for a specific teacher
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: parseInt(req.params.teacherId) },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            arm: true
          }
        }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new teacher assignment
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { teacherId, subjectId, classId } = req.body;

    // Validate required fields
    if (!teacherId || !subjectId || !classId) {
      return res.status(400).json({ error: 'Teacher, subject, and class are required' });
    }

    // Check if assignment already exists
    const existing = await prisma.teacherAssignment.findUnique({
      where: {
        teacherId_subjectId_classId: {
          teacherId: parseInt(teacherId),
          subjectId: parseInt(subjectId),
          classId: parseInt(classId)
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This teacher is already assigned to this subject in this class' });
    }

    // Create assignment
    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: parseInt(teacherId),
        subjectId: parseInt(subjectId),
        classId: parseInt(classId)
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        subject: true,
        class: true
      }
    });

    res.status(201).json({
      message: 'Teacher assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update assignment (Edit)
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { teacherId, subjectId, classId } = req.body;

    if (!teacherId || !subjectId || !classId) {
      return res.status(400).json({ error: 'All fields (teacher, subject, class) are required.' });
    }

    // Check availability/uniqueness is handled by database unique constraint (P2002)
    const updated = await prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data: {
        teacherId: parseInt(teacherId),
        subjectId: parseInt(subjectId),
        classId: parseInt(classId)
      },
      include: {
        teacher: {
          select: { firstName: true, lastName: true }
        },
        subject: true,
        class: true
      }
    });

    res.json({ message: 'Assignment updated successfully', assignment: updated });

  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(400).json({ error: 'This assignment already exists (Teacher + Subject + Class).' });
    }
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment.' });
  }
});

// Delete a teacher assignment
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    const assignment = await prisma.teacherAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.teacherAssignment.delete({
      where: { id: assignmentId }
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch create assignments for a teacher
router.post('/batch', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { teacherId, assignments } = req.body;

    if (!teacherId || !assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const created = [];
    const errors = [];

    for (const assignment of assignments) {
      try {
        const result = await prisma.teacherAssignment.create({
          data: {
            teacherId: parseInt(teacherId),
            subjectId: parseInt(assignment.subjectId),
            classId: parseInt(assignment.classId)
          },
          include: {
            subject: true,
            class: true
          }
        });
        created.push(result);
      } catch (error) {
        errors.push({
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          error: error.message
        });
      }
    }

    res.json({
      message: `Created ${created.length} assignments`,
      created,
      errors
    });
  } catch (error) {
    console.error('Error batch creating assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
