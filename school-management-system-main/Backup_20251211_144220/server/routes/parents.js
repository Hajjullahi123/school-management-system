const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// 1. Get My Children (Parent Dashboard)
router.get('/my-wards', authenticate, authorize('parent'), async (req, res) => {
  try {
    console.log('Parent wards request from user:', req.user.id, req.user.username);

    // Find parent profile
    const parent = await prisma.parent.findUnique({
      where: { userId: req.user.id },
      include: {
        students: {
          include: {
            classModel: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            results: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Latest result for quick view
            },
            attendanceRecords: {
              orderBy: { date: 'desc' },
              take: 5 // Recent attendance
            },
            feeRecords: {
              include: {
                academicSession: true,
                term: true,
                payments: {
                  orderBy: { paymentDate: 'desc' }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!parent) {
      console.log('No parent profile found for user:', req.user.id);
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    console.log('Parent found:', parent.id, 'Students:', parent.students.length);
    res.json(parent.students);
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

// DIAGNOSTIC: Check parent account status (NO AUTH REQUIRED - FOR TESTING ONLY)
router.get('/check-parent/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        parent: {
          include: {
            students: {
              include: {
                user: true,
                classModel: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.json({ error: 'User not found', username });
    }

    res.json({
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hasParentProfile: !!user.parent,
      parentId: user.parent?.id,
      linkedStudentsCount: user.parent?.students?.length || 0,
      students: user.parent?.students || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Register Parent (Admin only for now)
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, studentIds } = req.body;

    // Generate default email if not provided
    const parentEmail = email || `${phone}@parent.school`;

    // Check if phone already registered
    const existing = await prisma.user.findFirst({
      where: { username: phone }
    });

    if (existing) return res.status(400).json({ error: 'Parent with this phone number already exists' });

    // Create User (Username = Phone Number)
    const passwordHash = await bcrypt.hash('parent123', 10);

    // Transaction to create User + Parent + Link Students
    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: parentEmail,
          username: phone, // Phone as username for simplicity
          passwordHash,
          role: 'parent',
          isActive: true,
          mustChangePassword: true // Force password change on first login
        }
      });

      const parent = await prisma.parent.create({
        data: {
          userId: user.id,
          phone,
          address,
          // Link students if provided
          students: studentIds && studentIds.length > 0 ? {
            connect: studentIds.map(id => ({ id: parseInt(id) }))
          } : undefined
        }
      });

      return { parent, user };
    });

    console.log('Parent created successfully:', {
      username: phone,
      password: 'parent123',
      userId: result.user.id,
      parentId: result.parent.id
    });

    res.status(201).json({
      message: 'Parent account created',
      parentId: result.parent.id,
      credentials: {
        username: phone,
        password: 'parent123'
      }
    });
  } catch (error) {
    console.error('Create parent error:', error);
    res.status(500).json({ error: 'Failed to register parent' });
  }
});

// 3. Link Student to Parent
router.post('/link-student', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    // Check if student is already linked to a parent
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        parent: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.parentId !== null) {
      return res.status(400).json({
        error: `This student is already linked to ${student.parent.user.firstName} ${student.parent.user.lastName}. A student cannot be linked to multiple parents.`
      });
    }

    // Link student to parent
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: { parentId: parseInt(parentId) }
    });

    res.json({ message: 'Student linked successfully' });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ error: 'Failed to link student' });
  }
});

// 4. Get Parent Details (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const parents = await prisma.parent.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        students: { select: { id: true, admissionNumber: true, userId: true } }
      }
    });

    // Enhance with Student Names (need to fetch User for student)
    // Since `students.userId` points to User, we can assume frontend fetches details or we include deeper.
    // Prisma `students: { include: { user: true } }` would work.

    const enhancedParents = await prisma.parent.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true, username: true } },
        students: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: { select: { name: true, arm: true } }
          }
        }
      }
    });

    res.json(enhancedParents);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// 5. Update Parent (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address } = req.body;

    // Get parent with user info
    const parent = await prisma.parent.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Update user and parent in transaction
    await prisma.$transaction(async (prisma) => {
      // Update user fields
      await prisma.user.update({
        where: { id: parent.userId },
        data: {
          firstName,
          lastName,
          email: email || parent.user.email,
          username: phone // Update username if phone changes
        }
      });

      // Update parent fields
      await prisma.parent.update({
        where: { id: parseInt(id) },
        data: {
          phone,
          address
        }
      });
    });

    res.json({ message: 'Parent updated successfully' });
  } catch (error) {
    console.error('Update parent error:', error);
    res.status(500).json({ error: 'Failed to update parent' });
  }
});

// 6. Delete Parent (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get parent with user info
    const parent = await prisma.parent.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, students: true }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Delete in transaction
    await prisma.$transaction(async (prisma) => {
      // Unlink all students first
      if (parent.students && parent.students.length > 0) {
        await prisma.student.updateMany({
          where: { parentId: parseInt(id) },
          data: { parentId: null }
        });
      }

      // Delete parent record
      await prisma.parent.delete({
        where: { id: parseInt(id) }
      });

      // Delete user account
      await prisma.user.delete({
        where: { id: parent.userId }
      });
    });

    res.json({ message: 'Parent deleted successfully' });
  } catch (error) {
    console.error('Delete parent error:', error);
    res.status(500).json({ error: 'Failed to delete parent' });
  }
});

// 7. Unlink Student from Parent
router.post('/unlink-student', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { studentId } = req.body;

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        parent: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.parentId === null) {
      return res.status(400).json({ error: 'Student is not linked to any parent' });
    }

    // Unlink student from parent
    await prisma.student.update({
      where: { id: parseInt(studentId) },
      data: { parentId: null }
    });

    res.json({
      message: 'Student unlinked successfully',
      studentId: student.id,
      parentName: `${student.parent.user.firstName} ${student.parent.user.lastName}`
    });
  } catch (error) {
    console.error('Unlink student error:', error);
    res.status(500).json({ error: 'Failed to unlink student' });
  }
});

module.exports = router;
