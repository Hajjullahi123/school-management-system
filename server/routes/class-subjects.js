const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all class-subject associations
router.get('/', authenticate, async (req, res) => {
  try {
    const classSubjects = await prisma.classSubject.findMany({
      where: { schoolId: req.schoolId },
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
        },
        teacherAssignments: {
          where: { schoolId: req.schoolId },
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } }
      ]
    });
    res.json(classSubjects);
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subjects for a specific class with assignment status
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        schoolId: req.schoolId
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        teacherAssignments: {
          where: { schoolId: req.schoolId },
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        subject: { name: 'asc' }
      }
    });

    // Add assignment status to each subject
    const subjectsWithStatus = classSubjects.map(cs => ({
      ...cs,
      isAssigned: cs.teacherAssignments.length > 0,
      teacher: cs.teacherAssignments[0]?.teacher || null
    }));

    res.json(subjectsWithStatus);
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get count of unassigned subjects for a class
router.get('/class/:classId/unassigned-count', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        schoolId: req.schoolId
      },
      include: {
        teacherAssignments: {
          where: { schoolId: req.schoolId }
        }
      }
    });

    const unassignedCount = classSubjects.filter(cs => cs.teacherAssignments.length === 0).length;
    const totalCount = classSubjects.length;

    res.json({
      unassignedCount,
      totalCount,
      assignedCount: totalCount - unassignedCount
    });
  } catch (error) {
    console.error('Error counting unassigned subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a subject to a class
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { classId, subjectId } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ error: 'Class and subject are required' });
    }

    // Check if already exists
    const existing = await prisma.classSubject.findUnique({
      where: {
        schoolId_classId_subjectId: {
          schoolId: req.schoolId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId)
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This subject is already added to this class' });
    }

    const classSubject = await prisma.classSubject.create({
      data: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId)
      },
      include: {
        class: true,
        subject: true
      }
    });

    res.status(201).json({
      message: 'Subject added to class successfully',
      classSubject
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'ADD_SUBJECT_TO_CLASS',
      resource: 'CLASS_SUBJECT',
      details: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        classSubjectId: classSubject.id
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error adding subject to class:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch add subjects to a class
router.post('/batch', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { classId, subjectIds } = req.body;

    if (!classId || !subjectIds || !Array.isArray(subjectIds)) {
      return res.status(400).json({ error: 'Class and subject IDs array are required' });
    }

    const created = [];
    const errors = [];

    for (const subjectId of subjectIds) {
      try {
        // Check if already exists
        const existing = await prisma.classSubject.findUnique({
          where: {
            schoolId_classId_subjectId: {
              schoolId: req.schoolId,
              classId: parseInt(classId),
              subjectId: parseInt(subjectId)
            }
          }
        });

        if (!existing) {
          const classSubject = await prisma.classSubject.create({
            data: {
              schoolId: req.schoolId,
              classId: parseInt(classId),
              subjectId: parseInt(subjectId)
            },
            include: {
              subject: true
            }
          });
          created.push(classSubject);
        } else {
          errors.push({
            subjectId,
            error: 'Already exists'
          });
        }
      } catch (error) {
        errors.push({
          subjectId,
          error: error.message
        });
      }
    }

    res.json({
      message: `Added ${created.length} subjects to class`,
      created,
      errors
    });

    // Log the batch action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BATCH_ADD_SUBJECTS_TO_CLASS',
      resource: 'CLASS_SUBJECT',
      details: {
        classId: parseInt(classId),
        successCount: created.length,
        errorCount: errors.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error batch adding subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a subject from a class
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if has assignments
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        id,
        schoolId: req.schoolId
      },
      include: {
        teacherAssignments: {
          where: { schoolId: req.schoolId }
        }
      }
    });

    if (!classSubject) {
      return res.status(404).json({ error: 'Class subject not found' });
    }

    if (classSubject.teacherAssignments.length > 0) {
      return res.status(400).json({
        error: 'Cannot remove subject with assigned teachers. Please remove teacher assignments first.'
      });
    }

    await prisma.classSubject.delete({
      where: {
        id,
        schoolId: req.schoolId
      }
    });

    res.json({ message: 'Subject removed from class successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'REMOVE_SUBJECT_FROM_CLASS',
      resource: 'CLASS_SUBJECT',
      details: {
        classSubjectId: id,
        classId: classSubject.classId,
        subjectId: classSubject.subjectId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error removing subject from class:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update periods per week
router.patch('/:id/periods', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { periodsPerWeek } = req.body;

    if (periodsPerWeek === undefined || isNaN(parseInt(periodsPerWeek))) {
      return res.status(400).json({ error: 'Valid periods per week is required' });
    }

    const updated = await prisma.classSubject.update({
      where: {
        id,
        schoolId: req.schoolId
      },
      data: {
        periodsPerWeek: parseInt(periodsPerWeek)
      }
    });

    res.json({
      message: 'Periods per week updated successfully',
      updated
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE_CLASS_SUBJECT_PERIODS',
      resource: 'CLASS_SUBJECT',
      details: { id, periodsPerWeek: parseInt(periodsPerWeek) },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating periods:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
