const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateTeacherUsername, generateStudentUsername } = require('../utils/usernameGenerator');

// Get all users (Admin/Principal only)
router.get('/', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = { schoolId: parseInt(req.schoolId) };
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
        teacher: true,
        Parent: {
          include: {
            parentChildren: {
              include: {
                user: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedUsers = users.map(u => {
      // Robust mapping for parents to ensure consistent property names (parent vs Parent)
      if (u.Parent || u.role === 'parent') {
        return {
          ...u,
          parent: u.Parent ? {
            ...u.Parent,
            students: u.Parent.parentChildren || [],
            parentChildren: undefined
          } : null,
          Parent: undefined
        };
      }
      return u;
    });

    res.json(mappedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (Admin/Principal only)
router.post('/', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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
      specialization,
      // General
      phone,
      photoUrl
    } = req.body;

    let finalUsername;

    // Validation
    if (!role || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enforce singleton roles: only ONE admin, principal, accountant, examination_officer per school
    if (['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(role)) {
      const existing = await prisma.user.findFirst({
        where: { schoolId: parseInt(req.schoolId), role }
      });
      if (existing) {
        let roleLabel = '';
        if (role === 'admin') roleLabel = 'System Admin';
        else if (role === 'principal') roleLabel = 'School Principal';
        else if (role === 'examination_officer') roleLabel = 'Examination Officer';
        else if (role === 'attendance_admin') roleLabel = 'Attendance & Access Admin';
        else roleLabel = 'School Accountant';

        return res.status(400).json({
          error: `A ${roleLabel} account already exists for this school. Only one account of this type is allowed.`
        });
      }
    }

    // Auto-generate username if not provided
    if (!username) {
      // Fetch school information to get code
      const school = await prisma.school.findUnique({
        where: { id: req.schoolId },
        select: { code: true }
      });

      if (role === 'teacher') {
        finalUsername = await generateTeacherUsername(
          req.schoolId,
          school?.code || 'SCH',
          firstName,
          lastName,
          new Date().getFullYear()
        );
      } else if (['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(role)) {
        const schoolInitials = school?.name
          ? school.name.split(' ').filter(word => word.length > 0).map(word => word[0].toUpperCase()).join('').substring(0, 3)
          : (school?.code || 'SCH');

        // e.g., principal/AMA@123 or exam_off/AMA@123
        let position = role.toLowerCase();
        if (role === 'examination_officer') position = 'exam_off';
        if (role === 'attendance_admin') position = 'attend_off';

        let usernameExists = true;
        while (usernameExists) {
          const randomNums = Math.floor(100 + Math.random() * 900); // 3-digit random number
          finalUsername = `${position}/${schoolInitials}@${randomNums}`;

          const existing = await prisma.user.findFirst({
            where: { username: finalUsername, schoolId: parseInt(req.schoolId) }
          });
          if (!existing) usernameExists = false;
        }
      } else {
        const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
        // Check if username exists and add number if needed (PER school)
        let usernameExists = await prisma.user.findFirst({
          where: {
            username: baseUsername,
            schoolId: parseInt(req.schoolId)
          }
        });
        let counter = 1;
        finalUsername = baseUsername;

        while (usernameExists) {
          finalUsername = `${baseUsername}${counter}`;
          usernameExists = await prisma.user.findFirst({
            where: {
              username: finalUsername,
              schoolId: parseInt(req.schoolId)
            }
          });
          counter++;
        }
      }
    } else {
      finalUsername = username;
    }

    // Password is now optional for all roles - will be auto-generated if not provided

    if (!['admin', 'teacher', 'student', 'accountant', 'principal', 'examination_officer', 'attendance_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists in THIS school
    const existingUser = await prisma.user.findFirst({
      where: {
        username: finalUsername,
        schoolId: parseInt(req.schoolId)
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
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    // Create user with profile
    const userData = {
      schoolId: parseInt(req.schoolId),
      username: finalUsername,
      passwordHash,
      email: email || null,
      phone: phone || null,
      role,
      firstName,
      lastName,
      photoUrl: photoUrl || null
    };

    let user;

    if (role === 'student') {
      let finalAdmissionNumber = admissionNumber;

      // Auto-generate admission number if not provided
      if (!finalAdmissionNumber) {
        // Fetch school information to get code
        const school = await prisma.school.findUnique({
          where: { id: req.schoolId },
          select: { code: true }
        });

        finalAdmissionNumber = await generateStudentUsername(
          req.schoolId,
          school?.code || 'SCH',
          firstName,
          lastName,
          new Date().getFullYear()
        );

        // Use it as username if not provided
        if (!username) {
          finalUsername = finalAdmissionNumber.toLowerCase();
          userData.username = finalUsername;
        }
      }

      user = await prisma.user.create({
        data: {
          ...userData,
          student: {
            create: {
              schoolId: parseInt(req.schoolId),
              admissionNumber: finalAdmissionNumber,
              classId: classId ? parseInt(classId) : null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              parentEmail,
              parentPhone,
              rollNo: finalAdmissionNumber // For backward compatibility
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
          schoolId: parseInt(req.schoolId),
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
      const autoPasswordHash = await bcrypt.hash(generatedPassword, 10);

      // Use auto-generated credentials
      const finalStaffId = staffId || generatedStaffId;
      const finalPasswordHash = password ? await bcrypt.hash(password, 10) : autoPasswordHash;

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash,
          teacher: {
            create: {
              schoolId: parseInt(req.schoolId),
              staffId: finalStaffId,
              specialization
            }
          }
        },
        include: {
          teacher: true
        }
      });

      // Add generated credentials to response if auto-generated or if it's an admin-type role
      user.generatedCredentials = {
        staffId: finalStaffId,
        password: password || generatedPassword,
        username: finalUsername,
        role: 'Teacher'
      };
    } else if (role === 'accountant') {
      // Auto-generate password for accountant
      const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const finalPasswordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(generatedPassword, 10);

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash
        }
      });

      // Add generated credentials to response
      user.generatedCredentials = {
        password: password || generatedPassword,
        username: finalUsername,
        role: 'Financial Accountant'
      };
    } else {
      // Admin or other roles
      const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
      const finalPasswordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(generatedPassword, 10);

      user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash: finalPasswordHash
        }
      });

      // Add generated credentials to response
      user.generatedCredentials = {
        password: password || generatedPassword,
        username: finalUsername,
        role: role === 'examination_officer' ? 'Examination Officer' : (role === 'admin' ? 'System Admin' : (role === 'principal' ? 'School Principal' : role.charAt(0).toUpperCase() + role.slice(1)))
      };
    }

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);

    // Log the user creation
    logAction({
      schoolId: parseInt(req.schoolId),
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

// Update user (Admin/Principal only)
router.put('/:id', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      phone,
      firstName,
      lastName,
      isActive,
      // Student specific
      classId,
      parentEmail,
      parentPhone,
      admissionNumber,
      dateOfBirth,
      gender,
      stateOfOrigin,
      nationality,
      address,
      bloodGroup,
      genotype,
      disability,
      isScholarship,
      parentGuardianName,
      // Teacher specific
      specialization,
      staffId,
      // Password reset
      password,
      username,
      role,
      photoUrl
    } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        schoolId: parseInt(req.schoolId)
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
      phone,
      firstName,
      lastName,
      isActive,
      username,
      photoUrl
    };

    if (role) {
      if (!['admin', 'teacher', 'student', 'accountant', 'principal', 'examination_officer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updateData.role = role;
    }

    if (password && password.trim().length >= 6) {
      const trimmedPassword = password.trim();
      updateData.passwordHash = await bcrypt.hash(trimmedPassword, 10);
      updateData.mustChangePassword = true;
    }

    // Update user
    await prisma.user.update({
      where: {
        id: parseInt(id),
        schoolId: parseInt(req.schoolId)
      },
      data: updateData
    });

    // Update profile if exists
    if (user.student) {
      const studentUpdate = {
        parentEmail,
        parentPhone,
        parentGuardianName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        stateOfOrigin,
        nationality,
        address,
        bloodGroup,
        genotype,
        disability,
        isScholarship: isScholarship !== undefined ? isScholarship : undefined
      };
      if (classId !== undefined) studentUpdate.classId = classId ? parseInt(classId) : null;
      if (admissionNumber) studentUpdate.admissionNumber = admissionNumber;

      // Filter out undefined values
      Object.keys(studentUpdate).forEach(key => studentUpdate[key] === undefined && delete studentUpdate[key]);

      await prisma.student.update({
        where: {
          userId: parseInt(id),
          schoolId: parseInt(req.schoolId)
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
          schoolId: parseInt(req.schoolId)
        },
        data: teacherUpdate
      });
    }

    // Fetch updated user with profile
    const result = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        schoolId: parseInt(req.schoolId)
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
      schoolId: parseInt(req.schoolId),
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

// Delete user (Admin/Principal only) - Hard Delete
router.delete('/:id', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: parseInt(req.schoolId)
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
          // Comprehensive manual cascade delete for student records
          await prisma.attendanceRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.quranRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.quranTarget.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.cBTResult.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.homeworkSubmission.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.psychomotorDomain.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.studentReportCard.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.intervention.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.result.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          
          // Delete Fee Payments first (requires fetching fee record IDs)
          const feeRecords = await prisma.feeRecord.findMany({ where: { studentId, schoolId: parseInt(req.schoolId) }, select: { id: true } });
          const feeRecordIds = feeRecords.map(fr => fr.id);
          await prisma.feePayment.deleteMany({ where: { feeRecordId: { in: feeRecordIds }, schoolId: parseInt(req.schoolId) } });
          await prisma.feeRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.examCard.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.promotionHistory.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.onlinePayment.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.certificate.deleteMany({ where: { studentId } });
          await prisma.testimonial.deleteMany({ where: { studentId } });
          await prisma.alumni.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
          await prisma.homeworkSubmission.deleteMany({ where: { studentId } });
          
          await prisma.student.delete({
            where: {
              id: studentId,
              schoolId: parseInt(req.schoolId)
            }
          });
        }
      } else if (user.role === 'teacher' || user.teacher) {
        const teacherId = user.teacher?.id;
        if (teacherId) {
          await prisma.teacherAssignment.deleteMany({
            where: { teacherId: userId, schoolId: parseInt(req.schoolId) }
          });
          await prisma.teacher.delete({
            where: { id: teacherId, schoolId: parseInt(req.schoolId) }
          });
        }
      } else if (user.role === 'parent' || user.parent) {
        await prisma.parent.deleteMany({
          where: {
            userId: userId,
            schoolId: parseInt(req.schoolId)
          }
        });
      }

      // Cleanup user-created records that might block deletion
      await prisma.newsEvent.deleteMany({ where: { authorId: userId, schoolId: parseInt(req.schoolId) } });
      await prisma.notice.deleteMany({ where: { authorId: userId, schoolId: parseInt(req.schoolId) } });
      await prisma.galleryImage.deleteMany({ where: { uploadedBy: userId, schoolId: parseInt(req.schoolId) } });
      await prisma.nudge.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
      await prisma.department.updateMany({ where: { headId: userId }, data: { headId: null } });

      // Delete User
      await prisma.user.delete({
        where: {
          id: userId,
          schoolId: parseInt(req.schoolId)
        }
      });
    });

    res.json({ message: 'User and related records deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: parseInt(req.schoolId),
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

// Bulk create students (Admin/Principal only)
router.post('/bulk-students', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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
        const passwordHash = await bcrypt.hash(student.password || student.admissionNumber, 10);

        await prisma.user.create({
          data: {
            schoolId: parseInt(req.schoolId),
            username: student.username || student.admissionNumber,
            passwordHash,
            email: student.email,
            role: 'student',
            firstName: student.firstName,
            lastName: student.lastName,
            student: {
              create: {
                schoolId: parseInt(req.schoolId),
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
      schoolId: parseInt(req.schoolId),
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
