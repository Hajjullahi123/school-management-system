const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
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
          select: { students: true }
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
      where: { classTeacherId: req.user.id },
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id: parseInt(id) },
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
        teacherAssignments: {
          include: {
            subject: true,
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

    // Check if Teacher is already assigned to another class
    if (classTeacherId) {
      const existing = await prisma.class.findFirst({
        where: { classTeacherId: parseInt(classTeacherId) }
      });
      if (existing) {
        return res.status(400).json({ error: `Teacher is already Form Master for ${existing.name} ${existing.arm || ''}` });
      }
    }

    const classData = await prisma.class.create({
      data: {
        name,
        arm: arm || null,
        classTeacherId: classTeacherId ? parseInt(classTeacherId) : null
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(classData);
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
          id: { not: parseInt(id) } // Exclude current class
        }
      });

      if (existing) {
        return res.status(400).json({
          error: `Teacher is already Form Master for ${existing.name} ${existing.arm || ''}`
        });
      }
    }

    const classData = await prisma.class.update({
      where: { id: parseInt(id) },
      data: {
        name,
        arm,
        classTeacherId: classTeacherId ? parseInt(classTeacherId) : null
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(classData);
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

    // Transactional delete to handle dependencies
    await prisma.$transaction(async (prisma) => {
      // 1. Delete Student Results
      // First find students in this class
      const students = await prisma.student.findMany({
        where: { classId: classId },
        select: { id: true }
      });
      const studentIds = students.map(s => s.id);

      if (studentIds.length > 0) {
        await prisma.result.deleteMany({
          where: { studentId: { in: studentIds } }
        });
      }

      // 2. Delete Student Fee metadata/payments if applicable (skipped for safety unless requested, but usually foreign keys restrict)
      // Assuming cascade in schema? If not, we must delete manually.
      // Let's assume standard dependencies: Students, TeacherAssignments.

      // 3. Delete Teacher Assignments for this class
      await prisma.teacherAssignment.deleteMany({
        where: { classId: classId }
      });

      // 4. Delete Students in this class
      await prisma.student.deleteMany({
        where: { classId: classId }
      });

      // 5. Finally, Delete the Class
      await prisma.class.delete({
        where: { id: classId }
      });
    });

    res.json({ message: 'Class and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete class because it has associated records (e.g. Fees, Attendance) that prevent deletion.' });
    }
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

module.exports = router;
