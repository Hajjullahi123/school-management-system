const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all teacher assignments with class and subject details
router.get('/', authenticate, async (req, res) => {
  try {
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });
    const filterData = activeTerm ? { termId: activeTerm.id } : {};

    const assignments = await prisma.teacherAssignment.findMany({
      where: { schoolId: req.schoolId, ...filterData },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classSubject: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                arm: true
              }
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectations
    const transformedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      teacherId: assignment.teacherId,
      classId: assignment.classSubject.class.id,
      subjectId: assignment.classSubject.subject.id,
      classSubjectId: assignment.classSubjectId,
      createdAt: assignment.createdAt,
      teacher: assignment.teacher,
      class: assignment.classSubject.class,
      subject: assignment.classSubject.subject
    }));

    res.json(transformedAssignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignments for a specific teacher
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });
    const filterData = activeTerm ? { termId: activeTerm.id } : {};

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: parseInt(req.params.teacherId),
        schoolId: req.schoolId,
        ...filterData
      },
      include: {
        classSubject: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                arm: true
              }
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    // Transform to match frontend expectations
    const transformedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      teacherId: assignment.teacherId,
      classId: assignment.classSubject.class.id,
      subjectId: assignment.classSubject.subject.id,
      classSubjectId: assignment.classSubjectId,
      createdAt: assignment.createdAt,
      class: assignment.classSubject.class,
      subject: assignment.classSubject.subject
    }));

    res.json(transformedAssignments);
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new teacher assignment (Admin/Principal only)
router.post('/', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { teacherId, classSubjectId } = req.body;

    // Validate required fields
    if (!teacherId || !classSubjectId) {
      return res.status(400).json({ error: 'Teacher and class subject are required' });
    }

    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });
    const termId = activeTerm?.id || null;
    const academicSessionId = activeTerm?.academicSessionId || null;

    // Check if assignment already exists for this term
    const existing = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: parseInt(teacherId),
        classSubjectId: parseInt(classSubjectId),
        schoolId: req.schoolId,
        termId: termId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This teacher is already assigned to this subject' });
    }

    // Verify the classSubject exists
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        id: parseInt(classSubjectId),
        schoolId: req.schoolId
      },
      include: {
        class: true,
        subject: true
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found. Please ensure the subject is added to the class first.' });
    }

    // Create assignment
    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: parseInt(teacherId),
        classSubjectId: parseInt(classSubjectId),
        schoolId: req.schoolId,
        termId: termId,
        academicSessionId: academicSessionId
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classSubject: {
          include: {
            class: true,
            subject: true
          }
        }
      }
    });

    // Transform response
    const response = {
      id: assignment.id,
      teacherId: assignment.teacherId,
      classId: assignment.classSubject.class.id,
      subjectId: assignment.classSubject.subject.id,
      classSubjectId: assignment.classSubjectId,
      createdAt: assignment.createdAt,
      teacher: assignment.teacher,
      class: assignment.classSubject.class,
      subject: assignment.classSubject.subject
    };

    res.status(201).json({
      message: 'Teacher assigned successfully',
      assignment: response
    });

    // Log the creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        teacherId: parseInt(teacherId),
        classSubjectId: parseInt(classSubjectId),
        classId: response.classId,
        subjectId: response.subjectId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update assignment (Edit) (Admin/Principal only)
router.put('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { teacherId, classSubjectId } = req.body;

    if (!teacherId || !classSubjectId) {
      return res.status(400).json({ error: 'Teacher and class subject are required' });
    }

    // Verify the classSubject exists
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        id: parseInt(classSubjectId),
        schoolId: req.schoolId
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    // Verify the assignment exists AND belongs to this school
    const existingAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: req.schoolId
      }
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updated = await prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data: {
        teacherId: parseInt(teacherId),
        classSubjectId: parseInt(classSubjectId)
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        classSubject: {
          include: {
            class: true,
            subject: true
          }
        }
      }
    });

    // Transform response
    const response = {
      id: updated.id,
      teacherId: updated.teacherId,
      classId: updated.classSubject.class.id,
      subjectId: updated.classSubject.subject.id,
      classSubjectId: updated.classSubjectId,
      createdAt: updated.createdAt,
      teacher: updated.teacher,
      class: updated.classSubject.class,
      subject: updated.classSubject.subject
    };

    res.json({ message: 'Assignment updated successfully', assignment: response });

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        assignmentId: assignmentId,
        teacherId: parseInt(teacherId),
        classSubjectId: parseInt(classSubjectId)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This teacher is already assigned to this subject' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Delete a teacher assignment (Admin/Principal only)
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: req.schoolId
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.teacherAssignment.delete({
      where: { id: assignmentId }
    });

    res.json({ message: 'Assignment deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        assignmentId: assignmentId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch create assignments for a teacher (Admin/Principal only)
router.post('/batch', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { teacherId, classSubjectIds } = req.body;

    if (!teacherId || !classSubjectIds || !Array.isArray(classSubjectIds)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const created = [];
    const errors = [];

    for (const classSubjectId of classSubjectIds) {
      try {
        const result = await prisma.teacherAssignment.create({
          data: {
            teacherId: parseInt(teacherId),
            classSubjectId: parseInt(classSubjectId),
            schoolId: req.schoolId
          },
          include: {
            classSubject: {
              include: {
                class: true,
                subject: true
              }
            }
          }
        });
        created.push(result);
      } catch (error) {
        errors.push({
          classSubjectId,
          error: error.message
        });
      }
    }

    res.json({
      message: `Created ${created.length} assignments`,
      created,
      errors
    });

    // Log the batch action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BATCH_CREATE',
      resource: 'TEACHER_ASSIGNMENT',
      details: {
        teacherId: parseInt(teacherId),
        successCount: created.length,
        errorCount: errors.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error batch creating assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rollover assignments from a previous term
router.post('/rollover', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { sourceTermId } = req.body;
    if (!sourceTermId) {
      return res.status(400).json({ error: 'Source term ID is required' });
    }

    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });

    if (!activeTerm) {
      return res.status(400).json({ error: 'No currently active term found in the system' });
    }

    if (activeTerm.id === parseInt(sourceTermId)) {
      return res.status(400).json({ error: 'Source term cannot be the same as the active term' });
    }

    const oldAssignments = await prisma.teacherAssignment.findMany({
      where: {
        schoolId: req.schoolId,
        OR: [
          { termId: parseInt(sourceTermId) },
          { termId: null }
        ]
      }
    });

    let clonedCount = 0;

    for (const old of oldAssignments) {
      const existing = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: old.teacherId,
          classSubjectId: old.classSubjectId,
          termId: activeTerm.id,
          schoolId: req.schoolId
        }
      });

      if (!existing) {
        await prisma.teacherAssignment.create({
          data: {
            teacherId: old.teacherId,
            classSubjectId: old.classSubjectId,
            schoolId: req.schoolId,
            termId: activeTerm.id,
            academicSessionId: activeTerm.academicSessionId
          }
        });
        clonedCount++;
      }
    }

    res.json({ message: `Successfully cloned ${clonedCount} assignments to the active term.`, clonedCount });
    
    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'ROLLOVER',
      resource: 'TEACHER_ASSIGNMENT',
      details: { sourceTermId: parseInt(sourceTermId), clonedCount },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Error rolling over assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete all assignments for the active term
router.delete('/reset/active-term', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, isCurrent: true }
    });

    if (!activeTerm) {
      return res.status(400).json({ error: 'No active term found' });
    }

    const { count } = await prisma.teacherAssignment.deleteMany({
      where: {
        schoolId: req.schoolId,
        termId: activeTerm.id
      }
    });

    res.json({ message: `Successfully removed all ${count} assignments for the current term.` });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'RESET_ASSIGNMENTS',
      resource: 'TEACHER_ASSIGNMENT',
      details: { termId: activeTerm.id, count },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error resetting assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
