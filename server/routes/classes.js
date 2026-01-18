const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all classes
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {
      schoolId: req.schoolId,
      isActive: true
    };

    // If teacher, only return classes they are form master for
    if (req.user.role === 'teacher') {
      where.classTeacherId = req.user.id;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { arm: 'asc' }
      ]
    });

    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class assigned to the logged-in teacher
router.get('/my-class', authenticate, async (req, res) => {
  try {
    const classData = await prisma.class.findFirst({
      where: {
        classTeacherId: req.user.id,
        schoolId: req.schoolId,
        isActive: true
      },
      include: {
        students: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true
              }
            }
          }
        },
        _count: {
          select: { students: true }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({ message: 'No class assigned to this teacher' });
    }

    res.json(classData);
  } catch (error) {
    console.error('Get my class error:', error);
    res.status(500).json({ error: 'Failed to fetch your class' });
  }
});

// Get class by ID with students
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const classData = await prisma.class.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        students: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            }
          }
        },
        classSubjects: {
          include: {
            subject: true,
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
          }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create class (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, arm, classTeacherId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    // Check if Teacher is already assigned to another class in THIS school
    if (classTeacherId) {
      const existing = await prisma.class.findFirst({
        where: {
          classTeacherId: parseInt(classTeacherId),
          schoolId: req.schoolId
        }
      });
      if (existing) {
        return res.status(400).json({ error: `Teacher is already Form Master for ${existing.name} ${existing.arm || ''}` });
      }
    }

    const classData = await prisma.class.create({
      data: {
        schoolId: req.schoolId,
        name,
        arm: arm || null,
        classTeacherId: classTeacherId ? parseInt(classTeacherId) : null,
        expectedSubjects: req.body.expectedSubjects ? parseInt(req.body.expectedSubjects) : 0
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    res.status(201).json(classData);

    // Log the creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'CLASS',
      details: {
        classId: classData.id,
        name: classData.name,
        arm: classData.arm
      },
      ipAddress: req.ip
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Class name/arm already exists' });
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, arm, classTeacherId } = req.body;

    // Check if Teacher is already assigned to another class
    if (classTeacherId) {
      const existing = await prisma.class.findFirst({
        where: {
          classTeacherId: parseInt(classTeacherId),
          id: { not: parseInt(id) }, // Exclude current class
          schoolId: req.schoolId
        }
      });

      if (existing) {
        return res.status(400).json({
          error: `Teacher is already Form Master for ${existing.name} ${existing.arm || ''}`
        });
      }
    }

    const classData = await prisma.class.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        name,
        arm,
        classTeacherId: classTeacherId ? parseInt(classTeacherId) : null,
        expectedSubjects: req.body.expectedSubjects ? parseInt(req.body.expectedSubjects) : 0
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    res.json(classData);

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'CLASS',
      details: {
        classId: parseInt(id),
        updates: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Class name/arm already exists' });
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const classId = parseInt(id);

    // Implement soft delete: set isActive to false instead of deleting records
    const classData = await prisma.class.update({
      where: {
        id: classId,
        schoolId: req.schoolId
      },
      data: { isActive: false }
    });

    res.json({ message: 'Class deactivated successfully', class: classData });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'CLASS',
      details: {
        classId: classId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete class error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete class because it has associated records (e.g. Fees, Attendance) that prevent deletion.' });
    }
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Toggle result publishing status
router.put('/:id/publish-results', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const classId = parseInt(id);

    // If teacher, verify it's their class
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: classId, schoolId: req.schoolId },
        select: { classTeacherId: true }
      });
      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You can only publish results for your own class' });
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId, schoolId: req.schoolId },
      data: { isResultPublished: isPublished }
    });

    // 4. Send notifications if published (non-blocking)
    if (isPublished) {
      const { sendResultReleaseNotification } = require('../services/emailService');

      try {
        const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true, schoolId: req.schoolId } });
        const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true, schoolId: req.schoolId } });
        const settings = await prisma.school.findUnique({ where: { id: req.schoolId } });
        const schoolName = settings?.name || process.env.SCHOOL_NAME || 'School Management System';

        const students = await prisma.student.findMany({
          where: {
            classId: classId,
            schoolId: req.schoolId
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
            parent: { include: { user: { select: { email: true } } } }
          }
        });

        students.forEach(async (student) => {
          if (student.parent?.user?.email) {
            try {
              const resultCount = await prisma.result.count({
                where: {
                  studentId: student.id,
                  termId: currentTerm?.id,
                  academicSessionId: currentSession?.id,
                  schoolId: req.schoolId
                }
              });

              const resultData = {
                parentEmail: student.parent.user.email,
                studentName: `${student.user.firstName} ${student.user.lastName}`,
                termName: currentTerm?.name || 'Current Term',
                sessionName: currentSession?.name || 'Current Session',
                className: `${updatedClass.name} ${updatedClass.arm || ''}`.trim(),
                totalSubjects: resultCount,
                schoolName
              };
              sendResultReleaseNotification(resultData).catch(e => console.error('Result email error:', e));
            } catch (err) {
              console.error('Error in result notification processing for student:', student.id, err);
            }
          }
        });
      } catch (err) {
        console.error('Error initiating result notifications:', err);
      }
    }

    res.json({ message: `Results ${isPublished ? 'published' : 'unpublished'} successfully`, class: updatedClass });

    // Log the publishing action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: isPublished ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS',
      resource: 'CLASS',
      details: {
        classId: classId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Publish results error:', error);
    res.status(500).json({ error: `Failed to update result publishing status: ${error.message}` });
  }
});

module.exports = router;
