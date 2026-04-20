const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/audit');

// 1. Get My Children (Parent Dashboard)
router.get('/my-wards', authenticate, authorize(['parent', 'admin', 'principal']), async (req, res) => {
  try {

    const includeQuery = {
      students: {
        include: {
          classModel: {
            include: {
              classTeacher: {
                select: {
                  firstName: true,
                  lastName: true,
                  photoUrl: true,
                  username: true,
                  signatureUrl: true,
                  teacher: {
                    select: {
                      publicPhone: true,
                      publicEmail: true,
                      publicWhatsapp: true
                    }
                  }
                }
              }
            }
          },
          user: { select: { firstName: true, lastName: true, email: true, photoUrl: true } },
          results: {
            where: { schoolId: req.schoolId },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          attendanceRecords: {
            where: { schoolId: req.schoolId },
            orderBy: { date: 'desc' },
            take: 10
          },
          miscFeePayments: {
            where: { schoolId: req.schoolId },
            include: { fee: true },
            orderBy: { paymentDate: 'desc' }
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
    };

    // Find parent profile
    let parent = await prisma.parent.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: includeQuery
    });

    // If no parent profile but user is admin/principal, fetch a sample parent for preview
    if (!parent && ['admin', 'principal'].includes(req.user.role)) {
      parent = await prisma.parent.findFirst({
        where: {
          schoolId: req.schoolId,
          students: { some: {} } // Parent must have at least one student
        },
        include: includeQuery
      });
      if (parent) {
        console.log('Previewing parent dashboard with sample parent:', parent.id);
      }
    }

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


// 2. Register Parent (Admin/Principal only)
router.post('/register', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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
          mustChangePassword: false // No longer forced
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

// 3. Link Student to Parent (Admin/Principal)
router.post('/link-student', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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

// 4. Get Parent Details (Admin/Principal)
router.get('/', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const enhancedParents = await prisma.parent.findMany({
      where: { schoolId: req.schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, username: true } },
        students: {
          where: { schoolId: req.schoolId },
          include: {
            user: { select: { firstName: true, lastName: true, photoUrl: true } },
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

// 5. Update Parent (Admin/Principal)
router.put('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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

// 6. Delete Parent (Admin/Principal)
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
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

// 7. Unlink Student from Parent (Admin/Principal)
router.post('/unlink-student', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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
router.get('/student-attendance', authenticate, authorize(['parent', 'admin', 'principal']), async (req, res) => {
  try {
    const { studentId, sessionId, termId, startDate, endDate } = req.query;

    // Verify parent owns this student if not admin/principal
    if (!['admin', 'principal'].includes(req.user.role)) {
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
        const [sy, sm, sd] = startDate.split('-');
        where.date.gte = new Date(Date.UTC(parseInt(sy), parseInt(sm) - 1, parseInt(sd), 0, 0, 0));
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split('-');
        where.date.lte = new Date(Date.UTC(parseInt(ey), parseInt(em) - 1, parseInt(ed), 23, 59, 59, 999));
      }
    }

    // Fetch attendance records for this student
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        academicSession: { select: { name: true } },
        term: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    // Fetch class-wide attendance dates so frontend can compute unmarked days
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId: req.schoolId },
      select: { classId: true }
    });

    let classAttendanceDates = [];
    if (student?.classId) {
      // Build matching where clause for class dates (same filters as student)
      const classWhere = {
        schoolId: req.schoolId,
        classId: student.classId
      };
      if (sessionId) classWhere.academicSessionId = parseInt(sessionId);
      if (termId) classWhere.termId = parseInt(termId);
      if (startDate || endDate) {
        classWhere.date = {};
        if (startDate) {
          const [sy, sm, sd] = startDate.split('-');
          classWhere.date.gte = new Date(Date.UTC(parseInt(sy), parseInt(sm) - 1, parseInt(sd), 0, 0, 0));
        }
        if (endDate) {
          const [ey, em, ed] = endDate.split('-');
          classWhere.date.lte = new Date(Date.UTC(parseInt(ey), parseInt(em) - 1, parseInt(ed), 23, 59, 59, 999));
        }
      }

      const classDays = await prisma.attendanceRecord.groupBy({
        by: ['date'],
        where: classWhere
      });
      classAttendanceDates = classDays.map(d => d.date);
    }

    res.json({ records, classAttendanceDates });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// 9. Get Recent In-App Alerts for Parent Dashboard
router.get('/recent-alerts', authenticate, authorize(['parent', 'admin', 'principal']), async (req, res) => {
  try {
    const alerts = await prisma.parentTeacherMessage.findMany({
      where: {
        schoolId: req.schoolId,
        receiverId: req.user.id,
        messageType: 'attendance',
        isRead: false
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
