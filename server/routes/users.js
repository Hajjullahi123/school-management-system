const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = { schoolId: req.schoolId };
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
    if (!role || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-generate username if not provided (firstname.lastname format)
    let finalUsername = username;
    if (!finalUsername) {
      const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');

      // Check if username exists and add number if needed (PER school)
      let usernameExists = await prisma.user.findFirst({
        where: {
          username: baseUsername,
          schoolId: req.schoolId
        }
      });
      let counter = 1;
      finalUsername = baseUsername;

      while (usernameExists) {
        finalUsername = `${baseUsername}${counter}`;
        usernameExists = await prisma.user.findFirst({
          where: {
            username: finalUsername,
            schoolId: req.schoolId
          }
        });
        counter++;
      }
    }

    // Password is now optional for all roles - will be auto-generated if not provided

    if (!['admin', 'teacher', 'student', 'accountant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists in THIS school
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        schoolId: req.schoolId
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Auto-generate password if not provided
    let finalPassword = (password || '').trim();
    if (!finalPassword) {
      // For students, use admission number as default password if not provided
      // For others, use random string
      if (role === 'student') {
        finalPassword = admissionNumber;
      } else {
        finalPassword = Math.random().toString(36).slice(-8).toUpperCase();
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(finalPassword, 12);

    // Create user with profile
    const userData = {
      schoolId: req.schoolId,
      username: finalUsername,
      passwordHash,
      email: email || null, // Convert empty string to null
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
              schoolId: req.schoolId,
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
      // Fetch school information to get initials
      const school = await prisma.school.findUnique({
        where: { id: req.schoolId },
        select: { name: true }
      });

      // Generate school initials from school name
      const schoolInitials = school?.name
        ? school.name
          .split(' ')
          .filter(word => word.length > 0)
          .map(word => word[0].toUpperCase())
          .join('')
          .substring(0, 3) // Take max 3 letters
        : 'SCH';

      // Auto-generate Staff ID: INITIALS/YEAR/###
      const currentYear = new Date().getFullYear();

      // Find the highest existing sequence number for the current year
      const existingTeachers = await prisma.teacher.findMany({
        where: {
          schoolId: req.schoolId,
          staffId: {
            startsWith: `${schoolInitials}/${currentYear}/`
          }
        },
        select: {
          staffId: true
        }
      });

      // Extract sequence numbers and find the max
      let maxSequence = 0;
      const pattern = new RegExp(`${schoolInitials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/\\d{4}\\/(\\d{3})`);
      existingTeachers.forEach(teacher => {
        const match = teacher.staffId.match(pattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSequence) maxSequence = seq;
        }
      });

      const nextSequence = String(maxSequence + 1).padStart(3, '0');
      const generatedStaffId = `${schoolInitials}/${currentYear}/${nextSequence}`;

      // Auto-generate random password
      const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const autoPasswordHash = await bcrypt.hash(generatedPassword, 12);

      // Use auto-generated credentials
      const finalStaffId = staffId || generatedStaffId;
      const finalPasswordHash = password ? await bcrypt.hash(password, 12) : autoPasswordHash;

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash,
          teacher: {
            create: {
              schoolId: req.schoolId,
              staffId: finalStaffId,
              specialization
            }
          }
        },
        include: {
          teacher: true
        }
      });

      // Add generated credentials to response if auto-generated
      if (!staffId || !password) {
        user.generatedCredentials = {
          staffId: finalStaffId,
          password: password || generatedPassword,
          username: finalUsername,
          role: 'Teacher'
        };
      }
    } else if (role === 'accountant') {
      // Auto-generate password for accountant
      const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const finalPasswordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash(generatedPassword, 12);

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash
        }
      });

      // Add generated credentials to response
      if (!password) {
        user.generatedCredentials = {
          password: generatedPassword,
          username: finalUsername,
          role: 'Accountant'
        };
      }
    } else {
      // Admin or other roles
      const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const finalPasswordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash(generatedPassword, 12);

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash
        }
      });

      // Add generated credentials to response
      if (!password) {
        user.generatedCredentials = {
          password: generatedPassword,
          username: finalUsername,
          role: role.charAt(0).toUpperCase() + role.slice(1)
        };
      }
    }

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);

    // Log the user creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'USER',
      details: {
        newUserId: user.id,
        role: user.role,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`
      },
      ipAddress: req.ip
    });
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
      password,
      username
    } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
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
      isActive,
      username
    };

    if (password && password.trim().length >= 6) {
      const trimmedPassword = password.trim();
      updateData.passwordHash = await bcrypt.hash(trimmedPassword, 12);
      updateData.mustChangePassword = true; // Force change on next login if admin manually sets it
    }

    // Update user
    await prisma.user.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
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
        where: {
          userId: parseInt(id),
          schoolId: req.schoolId
        },
        data: studentUpdate
      });
    }

    if (user.teacher) {
      const teacherUpdate = {};
      if (specialization !== undefined) teacherUpdate.specialization = specialization;
      if (staffId) teacherUpdate.staffId = staffId;

      await prisma.teacher.update({
        where: {
          userId: parseInt(id),
          schoolId: req.schoolId
        },
        data: teacherUpdate
      });
    }

    // Fetch updated user with profile
    const result = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      include: {
        student: true,
        teacher: true
      }
    });

    // Remove password
    const { passwordHash, ...safeResult } = result;
    res.json(safeResult);

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'USER',
      details: {
        targetUserId: parseInt(id),
        updates: Object.keys(updateData).filter(k => k !== 'passwordHash')
      },
      ipAddress: req.ip
    });
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

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: req.schoolId
      },
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
        const studentId = user.student?.id;
        if (studentId) {
          await prisma.result.deleteMany({ where: { studentId, schoolId: req.schoolId } });
          await prisma.feePayment.deleteMany({ where: { feeRecord: { studentId }, schoolId: req.schoolId } });
          await prisma.feeRecord.deleteMany({ where: { studentId, schoolId: req.schoolId } });
          await prisma.examCard.deleteMany({ where: { studentId, schoolId: req.schoolId } });
          await prisma.student.delete({
            where: {
              id: studentId,
              schoolId: req.schoolId
            }
          });
        }
      } else if (user.role === 'teacher') {
        const teacherId = user.teacher?.id;
        if (teacherId) {
          await prisma.teacherAssignment.deleteMany({
            where: {
              teacherId: user.id,
              schoolId: req.schoolId
            }
          });
          await prisma.teacher.delete({
            where: {
              id: teacherId,
              schoolId: req.schoolId
            }
          });
        }
        await prisma.teacherAssignment.deleteMany({
          where: {
            teacherId: userId,
            schoolId: req.schoolId
          }
        });
      }

      // Delete User
      await prisma.user.delete({
        where: {
          id: userId,
          schoolId: req.schoolId
        }
      });
    });

    res.json({ message: 'User and related records deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'USER',
      details: {
        deletedUserId: userId,
        role: user.role,
        username: user.username
      },
      ipAddress: req.ip
    });
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
            schoolId: req.schoolId,
            username: student.username || student.admissionNumber,
            passwordHash,
            email: student.email,
            role: 'student',
            firstName: student.firstName,
            lastName: student.lastName,
            student: {
              create: {
                schoolId: req.schoolId,
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

    // Log bulk creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_CREATE',
      resource: 'STUDENT',
      details: {
        count: results.successful,
        failed: results.failed
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({ error: 'Failed to create students' });
  }
});

module.exports = router;
