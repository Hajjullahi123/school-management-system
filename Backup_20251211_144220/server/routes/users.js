const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        student: {
          include: {
            classModel: true
          }
        },
        teacher: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      role,
      firstName,
      lastName,
      // Student-specific
      admissionNumber,
      classId,
      dateOfBirth,
      parentEmail,
      parentPhone,
      // Teacher-specific
      staffId,
      specialization
    } = req.body;

    // Validation
    if (!username || !password || !role || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with profile
    const userData = {
      username,
      passwordHash,
      email,
      role,
      firstName,
      lastName
    };

    let user;

    if (role === 'student') {
      if (!admissionNumber) {
        return res.status(400).json({ error: 'Admission number is required for students' });
      }

      user = await prisma.user.create({
        data: {
          ...userData,
          student: {
            create: {
              admissionNumber,
              classId: classId ? parseInt(classId) : null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              parentEmail,
              parentPhone,
              rollNo: admissionNumber // For backward compatibility
            }
          }
        },
        include: {
          student: true
        }
      });
    } else if (role === 'teacher') {
      if (!staffId) {
        return res.status(400).json({ error: 'Staff ID is required for teachers' });
      }

      user = await prisma.user.create({
        data: {
          ...userData,
          teacher: {
            create: {
              staffId,
              specialization
            }
          }
        },
        include: {
          teacher: true
        }
      });
    } else {
      // Admin user
      user = await prisma.user.create({
        data: userData
      });
    }

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target?.[0];
      let message = 'Value already exists';

      if (target === 'username') message = 'Username already exists';
      if (target === 'email') message = 'Email already exists';
      if (target === 'staffId') message = 'Staff ID already exists';
      if (target === 'admissionNumber') message = 'Admission Number already exists';
      if (target === 'rollNo') message = 'Roll Number already exists';

      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      firstName,
      lastName,
      isActive,
      // Student specific
      classId,
      parentEmail,
      parentPhone,
      admissionNumber,
      // Teacher specific
      specialization,
      staffId,
      // Password reset
      password
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        teacher: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update data
    const updateData = {
      email,
      firstName,
      lastName,
      isActive
    };

    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    // Update user
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Update profile if exists
    if (user.student) {
      const studentUpdate = {
        parentEmail,
        parentPhone
      };
      if (classId !== undefined) studentUpdate.classId = classId ? parseInt(classId) : null;
      if (admissionNumber) studentUpdate.admissionNumber = admissionNumber;

      await prisma.student.update({
        where: { userId: parseInt(id) },
        data: studentUpdate
      });
    }

    if (user.teacher) {
      const teacherUpdate = {};
      if (specialization !== undefined) teacherUpdate.specialization = specialization;
      if (staffId) teacherUpdate.staffId = staffId;

      await prisma.teacher.update({
        where: { userId: parseInt(id) },
        data: teacherUpdate
      });
    }

    // Fetch updated user with profile
    const result = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        teacher: true
      }
    });

    // Remove password
    const { passwordHash, ...safeResult } = result;
    res.json(safeResult);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin only) - Hard Delete
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacher: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Manual Cascade Delete
    await prisma.$transaction(async (prisma) => {
      if (user.role === 'student') {
        // Delete related student data
        const studentId = user.student?.id;
        if (studentId) {
          await prisma.result.deleteMany({ where: { studentId } });
          // Note: FeePayments & OnlinePayments prevent deleting FeeRecords usually
          // We might need to keep the user inactive instead if financial records exist
          // But user requested "remove from database". 
          // Best effort clean up:
          await prisma.feePayment.deleteMany({ where: { feeRecord: { studentId } } });
          await prisma.feeRecord.deleteMany({ where: { studentId } });
          await prisma.examCard.deleteMany({ where: { studentId } });
          await prisma.student.delete({ where: { id: studentId } });
        }
      } else if (user.role === 'teacher') {
        const teacherId = user.teacher?.id;
        if (teacherId) {
          // Delete assignments
          await prisma.teacherAssignment.deleteMany({ where: { teacherId: user.id } }); // Note: Assignments use teacherId (User ID) or Teacher Table ID? 
          // Checking schema: assignments use teacherId which references User(id). 

          await prisma.teacher.delete({ where: { id: teacherId } });
        }
        // Also delete assignments if they link to User ID directly
        await prisma.teacherAssignment.deleteMany({ where: { teacherId: userId } });
      }

      // Delete User
      await prisma.user.delete({ where: { id: userId } });
    });

    res.json({ message: 'User and related records deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === 'P2003') { // Foreign key constraint failed
      return res.status(400).json({ error: 'Cannot delete user due to existing related records (e.g. payments). Try deactivating instead.' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Bulk create students (Admin only)
router.post('/bulk-students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { students } = req.body; // Array of student data

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Students array is required' });
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      try {
        const passwordHash = await bcrypt.hash(student.password || student.admissionNumber, 12);

        await prisma.user.create({
          data: {
            username: student.username || student.admissionNumber,
            passwordHash,
            email: student.email,
            role: 'student',
            firstName: student.firstName,
            lastName: student.lastName,
            student: {
              create: {
                admissionNumber: student.admissionNumber,
                classId: student.classId ? parseInt(student.classId) : null,
                dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
                parentEmail: student.parentEmail,
                parentPhone: student.parentPhone,
                rollNo: student.admissionNumber
              }
            }
          }
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: student,
          error: error.message
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({ error: 'Failed to create students' });
  }
});

module.exports = router;
