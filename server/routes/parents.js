const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/audit');

// 1. Get My Children (Parent Dashboard)
router.get('/my-wards', authenticate, authorize('parent'), async (req, res) => {
  try {
    console.log('Parent wards request from user:', req.user.id, req.user.username);

    // Find parent profile
    const parent = await prisma.parent.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: {
        students: {
          include: {
            classModel: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            results: {
              where: { schoolId: req.schoolId },
              orderBy: { createdAt: 'desc' },
              take: 1 // Latest result for quick view
            },
            attendanceRecords: {
              where: { schoolId: req.schoolId },
              orderBy: { date: 'desc' },
              take: 5 // Recent attendance
            },
            feeRecords: {
              where: { schoolId: req.schoolId },
              include: {
                academicSession: true,
                term: true,
                payments: {
                  where: { schoolId: req.schoolId },
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
    const { schoolId } = req.query; // Need schoolId for uniqueness now

    const user = await prisma.user.findFirst({
      where: {
        username,
        schoolId: schoolId ? parseInt(schoolId) : undefined
      },
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

    // Check if phone already registered in THIS school
    const existingPhone = await prisma.user.findFirst({
      where: {
        username: phone,
        schoolId: req.schoolId
      }
    });

    if (existingPhone) return res.status(400).json({ error: 'Parent with this phone number already exists' });

    // Check if email already registered in THIS school
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: parentEmail,
        schoolId: req.schoolId
      }
    });

    if (existingEmail) return res.status(400).json({ error: 'Parent with this email already exists. Please provide a different email or phone number.' });

    // Validate student IDs if provided
    if (studentIds && studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          id: { in: studentIds.map(id => parseInt(id)) },
          schoolId: req.schoolId
        }
      });

      if (students.length !== studentIds.length) {
        return res.status(400).json({
          error: 'One or more student IDs are invalid or do not belong to this school'
        });
      }

      // Check if any students are already linked to another parent
      const alreadyLinked = students.filter(s => s.parentId !== null);
      if (alreadyLinked.length > 0) {
        return res.status(400).json({
          error: `Some students are already linked to another parent: ${alreadyLinked.map(s => s.admissionNumber).join(', ')}`
        });
      }
    }

    // Create User (Username = Phone Number)
    const passwordHash = await bcrypt.hash('parent123', 10);

    // Transaction to create User + Parent + Link Students
    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          schoolId: req.schoolId,
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
          schoolId: req.schoolId,
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

    // Log the registration
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'PARENT_ACCOUNT',
      details: {
        parentId: result.parent.id,
        phone,
        studentCount: studentIds?.length || 0
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create parent error:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[1] || 'field';
      if (field === 'email') {
        return res.status(400).json({ error: 'A parent with this email already exists' });
      } else if (field === 'username') {
        return res.status(400).json({ error: 'A parent with this phone number already exists' });
      }
      return res.status(400).json({ error: `Duplicate ${field} detected` });
    }

    // Handle other Prisma errors
    if (error.code) {
      return res.status(400).json({ error: `Database error: ${error.message}` });
    }

    res.status(500).json({ error: 'Failed to register parent. Please try again.' });
  }
});

// 3. Link Student to Parent
router.post('/link-student', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
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
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      data: { parentId: parseInt(parentId) }
    });

    res.json({ message: 'Student linked successfully' });

    // Log the link
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'LINK_STUDENT',
      resource: 'PARENT_STUDENT_LINK',
      details: {
        parentId: parseInt(parentId),
        studentId: parseInt(studentId)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Link student error:', error);
    res.status(500).json({ error: 'Failed to link student' });
  }
});

// 4. Get Parent Details (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const enhancedParents = await prisma.parent.findMany({
      where: { schoolId: req.schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, username: true } },
        students: {
          where: { schoolId: req.schoolId },
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
    const parent = await prisma.parent.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      include: { user: true }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Update user and parent in transaction
    await prisma.$transaction(async (prisma) => {
      // Update user fields
      await prisma.user.update({
        where: {
          id: parent.userId,
          schoolId: req.schoolId
        },
        data: {
          firstName,
          lastName,
          email: email || parent.user.email,
          username: phone // Update username if phone changes
        }
      });

      // Update parent fields
      await prisma.parent.update({
        where: {
          id: parseInt(id),
          schoolId: req.schoolId
        },
        data: {
          phone,
          address
        }
      });
    });

    res.json({ message: 'Parent updated successfully' });

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'PARENT_ACCOUNT',
      details: {
        parentId: parseInt(id),
        phone
      },
      ipAddress: req.ip
    });
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
    const parent = await prisma.parent.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      include: { user: true, students: true }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Delete in transaction
    await prisma.$transaction(async (prisma) => {
      // Unlink all students first
      await prisma.student.updateMany({
        where: {
          parentId: parseInt(id),
          schoolId: req.schoolId
        },
        data: { parentId: null }
      });

      // Delete parent record
      await prisma.parent.delete({
        where: {
          id: parseInt(id),
          schoolId: req.schoolId
        }
      });

      // Delete user account
      await prisma.user.delete({
        where: {
          id: parent.userId,
          schoolId: req.schoolId
        }
      });
    });

    res.json({ message: 'Parent deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'PARENT_ACCOUNT',
      details: {
        parentId: parseInt(id)
      },
      ipAddress: req.ip
    });
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
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
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
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      data: { parentId: null }
    });

    res.json({
      message: 'Student unlinked successfully',
      studentId: student.id,
      parentName: `${student.parent.user.firstName} ${student.parent.user.lastName}`
    });

    // Log the unlink
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UNLINK_STUDENT',
      resource: 'PARENT_STUDENT_LINK',
      details: {
        studentId: parseInt(studentId),
        parentId: student.parentId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Unlink student error:', error);
    res.status(500).json({ error: 'Failed to unlink student' });
  }
});

// 8. Get Student Attendance (Parent view their ward's attendance)
router.get('/student-attendance', authenticate, authorize('parent'), async (req, res) => {
  try {
    const { studentId, sessionId, termId, startDate, endDate } = req.query;

    // Verify parent owns this student
    const parent = await prisma.parent.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: {
        students: {
          where: { schoolId: req.schoolId },
          select: { id: true }
        }
      }
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    const studentIds = parent.students.map(s => s.id);
    if (!studentIds.includes(parseInt(studentId))) {
      return res.status(403).json({ error: 'You can only view attendance for your own children' });
    }

    // Build where clause
    const where = {
      studentId: parseInt(studentId),
      schoolId: req.schoolId
    };

    if (sessionId) {
      where.academicSessionId = parseInt(sessionId);
    }

    if (termId) {
      where.termId = parseInt(termId);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Fetch attendance records
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        academicSession: { select: { name: true } },
        term: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(records);
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

module.exports = router;
