const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateTeacherUsername, generateStudentUsername } = require('../utils/usernameGenerator');

// Get all users (Admin/Principal only)
router.get('/', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = { schoolId: parseInt(req.schoolId) };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search } },
        {firstName: {contains: search}},
        {middleName: {contains: search}},
        {lastName: {contains: search}},
        {email: {contains: search}}
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
router.post('/', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      role,
      firstName,
      middleName,
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
      } else if (['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin'].includes(role)) {
        const schoolInitials = school?.name
          ? school.name.split(' ').filter(word => word.length > 0).map(word => word[0].toUpperCase()).join('').substring(0, 3)
          : (school?.code || 'SCH');

        // e.g., principal/AMA@123 or exam_off/AMA@123 or sub_admin/AMA@123
        let position = role.toLowerCase();
        if (role === 'examination_officer') position = 'exam_off';
        if (role === 'attendance_admin') position = 'attend_off';
        if (role === 'sub_admin') position = 'sub_admin';

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

    if (!['admin', 'sub_admin', 'teacher', 'student', 'accountant', 'principal', 'examination_officer', 'attendance_admin', 'higher_student'].includes(role)) {
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
      // For students, use '123456' as default password (consistent with all other creation routes)
      // For others, use FirstNameL@123 pattern
      if (role === 'student') {
        finalPassword = '123456';
      } else {
        const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
        finalPassword = `${firstName}${lastInitial}@123`;
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
      middleName: middleName || null,
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
              middleName: middleName || null,
              rollNo: finalAdmissionNumber // For backward compatibility
            }
          }
        },
        include: {
          student: true
        }
      });
    } else if (role === 'teacher' || role === 'higher_student') {
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

      // Auto-generate Staff ID: INITIALS/YEAR/### (HE- prefix for higher education students)
      const currentYear = new Date().getFullYear();
      const idPrefix = role === 'higher_student' ? `HE-${schoolInitials}/${currentYear}/` : `${schoolInitials}/${currentYear}/`;

      // Find the highest existing sequence number for the current year
      const existingTeachers = await prisma.teacher.findMany({
        where: {
          schoolId: parseInt(req.schoolId),
          staffId: {
            startsWith: idPrefix
          }
        },
        select: {
          staffId: true
        }
      });

      // Extract sequence numbers and find the max
      let maxSequence = 0;
      const escapedInitials = schoolInitials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = role === 'higher_student'
        ? new RegExp(`HE-${escapedInitials}\\/\\d{4}\\/(\\d{3})`)
        : new RegExp(`${escapedInitials}\\/\\d{4}\\/(\\d{3})`);
      existingTeachers.forEach(teacher => {
        const match = teacher.staffId.match(pattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSequence) maxSequence = seq;
        }
      });

      const nextSequence = String(maxSequence + 1).padStart(3, '0');
      const generatedStaffId = `${role === 'higher_student' ? 'HE-' : ''}${schoolInitials}/${currentYear}/${nextSequence}`;

      // Auto-generate password based on new requirements
      const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
      const generatedPassword = `${firstName}${lastInitial}@123`;
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
        role: role === 'higher_student' ? 'Student in Higher Institution' : 'Teacher'
      };
    } else if (role === 'accountant') {
      // Auto-generate password for accountant
      const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
      const generatedPassword = `${firstName}${lastInitial}@123`;
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
      const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
      const generatedPassword = `${firstName}${lastInitial}@123`;
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
        role: role === 'sub_admin' ? 'Sub Admin' : (role === 'examination_officer' ? 'Examination Officer' : (role === 'admin' ? 'System Admin' : (role === 'principal' ? 'School Principal' : role.charAt(0).toUpperCase() + role.slice(1))))
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
router.put('/:id', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      phone,
      firstName,
      middleName,
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
      middleName,
      lastName,
      isActive,
      username,
      photoUrl
    };

    if (role) {
      if (!['admin', 'sub_admin', 'teacher', 'student', 'accountant', 'principal', 'examination_officer', 'attendance_admin', 'higher_student'].includes(role)) {
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
        isScholarship: isScholarship !== undefined ? isScholarship : undefined,
        middleName
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

    if (user.teacher || role === 'teacher' || role === 'higher_student') {
      const teacherUpdate = {};
      if (specialization !== undefined) teacherUpdate.specialization = specialization;
      if (staffId) teacherUpdate.staffId = staffId;

      if (user.teacher) {
        await prisma.teacher.update({
          where: {
            userId: parseInt(id),
            schoolId: parseInt(req.schoolId)
          },
          data: teacherUpdate
        });
      } else {
        // Create teacher backing profile if it doesn't exist
        const school = await prisma.school.findUnique({
          where: { id: req.schoolId },
          select: { name: true }
        });
        const schoolInitials = school?.name
          ? school.name.split(' ').filter(word => word.length > 0).map(word => word[0].toUpperCase()).join('').substring(0, 3)
          : 'SCH';
        const currentYear = new Date().getFullYear();
        const generatedStaffId = `${role === 'higher_student' ? 'HE-' : ''}${schoolInitials}/${currentYear}/${Math.floor(100 + Math.random() * 900)}`;

        await prisma.teacher.create({
          data: {
            schoolId: parseInt(req.schoolId),
            userId: parseInt(id),
            staffId: staffId || generatedStaffId,
            specialization: specialization || null
          }
        });
      }
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

// Check user dependencies before deletion (Admin/Principal only)
router.get('/:id/dependencies', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const schoolId = parseInt(req.schoolId);

    const user = await prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: { teacher: true, student: true, Parent: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dependencies = {};
    let totalDependencies = 0;

    if (user.role === 'teacher' || user.teacher) {
      const teacherId = user.teacher?.id;

      // Count all teacher-related dependencies
      const [
        assignments, classTeacherRoles, lessonPlans, lessonNotes,
        examRepos, cbtExams, cbtQuestionBanks, quranRecords,
        homework, learningResources, staffAttendance, payrollRecords,
        leaveRequests, loanRequests, materialRequests, hrMessages,
        departmentResources, feePayments, certificatesIssued, testimonialsIssued
      ] = await Promise.all([
        prisma.teacherAssignment.count({ where: { teacherId: userId, schoolId } }),
        prisma.class.count({ where: { classTeacherId: userId, schoolId } }),
        prisma.lessonPlan.count({ where: { teacherId: userId, schoolId } }),
        prisma.lessonNote.count({ where: { teacherId: userId, schoolId } }),
        prisma.examRepository.count({ where: { teacherId: userId, schoolId } }),
        prisma.cBTExam.count({ where: { teacherId: userId, schoolId } }),
        prisma.cBTQuestionBank.count({ where: { teacherId: userId, schoolId } }),
        prisma.quranRecord.count({ where: { teacherId: userId, schoolId } }),
        prisma.homework.count({ where: { teacherId: userId, schoolId } }),
        prisma.learningResource.count({ where: { teacherId: userId, schoolId } }),
        prisma.staffAttendance.count({ where: { userId, schoolId } }),
        prisma.payrollRecord.count({ where: { staffId: userId } }),
        prisma.leaveRequest.count({ where: { staffId: userId, schoolId } }),
        prisma.loanRequest.count({ where: { staffId: userId } }),
        prisma.materialRequest.count({ where: { staffId: userId, schoolId } }),
        prisma.hRMessage.count({ where: { staffId: userId, schoolId } }),
        prisma.departmentResource.count({ where: { uploaderId: userId, schoolId } }),
        prisma.feePayment.count({ where: { recordedBy: userId, schoolId } }),
        prisma.certificate.count({ where: { issuedBy: userId, schoolId } }),
        prisma.testimonial.count({ where: { issuedBy: userId, schoolId } })
      ]);

      // Only include non-zero dependencies
      if (assignments > 0) dependencies.subjectAssignments = assignments;
      if (classTeacherRoles > 0) dependencies.classTeacherRoles = classTeacherRoles;
      if (lessonPlans > 0) dependencies.lessonPlans = lessonPlans;
      if (lessonNotes > 0) dependencies.lessonNotes = lessonNotes;
      if (examRepos > 0) dependencies.examRepositories = examRepos;
      if (cbtExams > 0) dependencies.cbtExams = cbtExams;
      if (cbtQuestionBanks > 0) dependencies.cbtQuestionBanks = cbtQuestionBanks;
      if (quranRecords > 0) dependencies.quranRecords = quranRecords;
      if (homework > 0) dependencies.homework = homework;
      if (learningResources > 0) dependencies.learningResources = learningResources;
      if (staffAttendance > 0) dependencies.staffAttendance = staffAttendance;
      if (payrollRecords > 0) dependencies.payrollRecords = payrollRecords;
      if (leaveRequests > 0) dependencies.leaveRequests = leaveRequests;
      if (loanRequests > 0) dependencies.loanRequests = loanRequests;
      if (materialRequests > 0) dependencies.materialRequests = materialRequests;
      if (hrMessages > 0) dependencies.hrMessages = hrMessages;
      if (departmentResources > 0) dependencies.departmentResources = departmentResources;
      if (feePayments > 0) dependencies.feePaymentsRecorded = feePayments;
      if (certificatesIssued > 0) dependencies.certificatesIssued = certificatesIssued;
      if (testimonialsIssued > 0) dependencies.testimonialsIssued = testimonialsIssued;

      // Fetch class teacher details for display
      if (classTeacherRoles > 0) {
        const classes = await prisma.class.findMany({
          where: { classTeacherId: userId, schoolId },
          select: { name: true, arm: true }
        });
        dependencies.classTeacherDetails = classes.map(c => c.arm ? `${c.name} ${c.arm}` : c.name);
      }

      totalDependencies = Object.keys(dependencies).filter(k => k !== 'classTeacherDetails').reduce((sum, key) => sum + (dependencies[key] || 0), 0);
    } else if (user.role === 'student') {
      const studentId = user.student?.id;
      if (studentId) {
        const [results, attendance, feeRecords, quranRecords] = await Promise.all([
          prisma.result.count({ where: { studentId, schoolId } }),
          prisma.attendanceRecord.count({ where: { studentId, schoolId } }),
          prisma.feeRecord.count({ where: { studentId, schoolId } }),
          prisma.quranRecord.count({ where: { studentId, schoolId } })
        ]);
        if (results > 0) dependencies.results = results;
        if (attendance > 0) dependencies.attendanceRecords = attendance;
        if (feeRecords > 0) dependencies.feeRecords = feeRecords;
        if (quranRecords > 0) dependencies.quranRecords = quranRecords;
        totalDependencies = results + attendance + feeRecords + quranRecords;
      }
    }

    const hasDependencies = totalDependencies > 0;

    res.json({
      userId,
      role: user.role,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      hasDependencies,
      totalDependencies,
      dependencies,
      recommendation: hasDependencies ? 'deactivate' : 'safe_to_delete',
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Check dependencies error:', error);
    res.status(500).json({ error: 'Failed to check user dependencies' });
  }
});

// Delete user (Admin/Principal only) - Hard Delete with Safety Guards
router.delete('/:id', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const schoolId = parseInt(req.schoolId);
    const { force } = req.body || {};

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId
      },
      include: {
        student: true,
        teacher: true,
        Parent: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Server-side safety guard for teachers with dependencies
    if (user.role === 'teacher' || user.teacher) {
      const [assignmentCount, classTeacherCount] = await Promise.all([
        prisma.teacherAssignment.count({ where: { teacherId: userId, schoolId } }),
        prisma.class.count({ where: { classTeacherId: userId, schoolId } })
      ]);

      if ((assignmentCount > 0 || classTeacherCount > 0) && !force) {
        return res.status(409).json({
          error: 'This teacher has active responsibilities. Use the dependency check to review before deleting.',
          hasDependencies: true,
          assignments: assignmentCount,
          classTeacherRoles: classTeacherCount,
          suggestion: 'Consider deactivating the teacher instead of deleting. Pass { force: true } to confirm permanent deletion.'
        });
      }
    }

    // Manual Cascade Delete
    await prisma.$transaction(async (prisma) => {
      if (user.role === 'student') {
        const studentId = user.student?.id;
        if (studentId) {
          // Comprehensive manual cascade delete for student records
          await prisma.attendanceRecord.deleteMany({ where: { studentId, schoolId } });
          await prisma.quranRecord.deleteMany({ where: { studentId, schoolId } });
          await prisma.quranTarget.deleteMany({ where: { studentId, schoolId } });
          await prisma.cBTResult.deleteMany({ where: { studentId, schoolId } });
          await prisma.homeworkSubmission.deleteMany({ where: { studentId, schoolId } });
          await prisma.psychomotorDomain.deleteMany({ where: { studentId, schoolId } });
          await prisma.studentReportCard.deleteMany({ where: { studentId, schoolId } });
          await prisma.intervention.deleteMany({ where: { studentId, schoolId } });
          await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId, schoolId } });
          await prisma.result.deleteMany({ where: { studentId, schoolId } });
          
          // Delete Fee Payments first (requires fetching fee record IDs)
          const feeRecords = await prisma.feeRecord.findMany({ where: { studentId, schoolId }, select: { id: true } });
          const feeRecordIds = feeRecords.map(fr => fr.id);
          await prisma.feePayment.deleteMany({ where: { feeRecordId: { in: feeRecordIds }, schoolId } });
          await prisma.feeRecord.deleteMany({ where: { studentId, schoolId } });
          await prisma.examCard.deleteMany({ where: { studentId, schoolId } });
          await prisma.promotionHistory.deleteMany({ where: { studentId, schoolId } });
          await prisma.onlinePayment.deleteMany({ where: { studentId, schoolId } });
          await prisma.certificate.deleteMany({ where: { studentId } });
          await prisma.testimonial.deleteMany({ where: { studentId } });
          await prisma.alumni.deleteMany({ where: { studentId, schoolId } });
          await prisma.homeworkSubmission.deleteMany({ where: { studentId } });
          
          await prisma.student.delete({
            where: {
              id: studentId,
              schoolId
            }
          });
        }
      } else if (user.role === 'teacher' || user.teacher) {
        const teacherId = user.teacher?.id;
        if (teacherId) {
          // Clean up TeacherAvailability (references Teacher.id, not User.id)
          await prisma.teacherAvailability.deleteMany({
            where: { teacherId, schoolId }
          });

          // Clean up TeacherAssignments
          await prisma.teacherAssignment.deleteMany({
            where: { teacherId: userId, schoolId }
          });

          // Unlink from classes where teacher is class teacher
          await prisma.class.updateMany({
            where: { classTeacherId: userId, schoolId },
            data: { classTeacherId: null }
          });

          // Clean up lesson plans and notes
          await prisma.lessonPlan.deleteMany({ where: { teacherId: userId, schoolId } });
          await prisma.lessonNote.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up exam repositories
          await prisma.examRepository.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up CBT data — delete questions first (FK to CBTExam), then exams
          const cbtExams = await prisma.cBTExam.findMany({ where: { teacherId: userId, schoolId }, select: { id: true } });
          const cbtExamIds = cbtExams.map(e => e.id);
          if (cbtExamIds.length > 0) {
            await prisma.cBTResult.deleteMany({ where: { examId: { in: cbtExamIds }, schoolId } });
            await prisma.cBTQuestion.deleteMany({ where: { examId: { in: cbtExamIds } } });
          }
          await prisma.cBTExam.deleteMany({ where: { teacherId: userId, schoolId } });
          await prisma.cBTQuestionBank.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up homework — delete submissions first, then homework
          const homeworks = await prisma.homework.findMany({ where: { teacherId: userId, schoolId }, select: { id: true } });
          const homeworkIds = homeworks.map(h => h.id);
          if (homeworkIds.length > 0) {
            await prisma.homeworkSubmission.deleteMany({ where: { homeworkId: { in: homeworkIds } } });
          }
          await prisma.homework.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up learning resources
          await prisma.learningResource.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up Quran records (as teacher — teacherId is required, must delete)
          await prisma.quranRecord.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up interventions (teacherId is required, must delete)
          await prisma.intervention.deleteMany({ where: { teacherId: userId, schoolId } });

          // Clean up staff attendance
          await prisma.staffAttendance.updateMany({
            where: { verifiedById: userId, schoolId },
            data: { verifiedById: null }
          });
          await prisma.staffAttendance.deleteMany({ where: { userId, schoolId } });

          // Clean up payroll — delete allowances and deductions first
          const payrollRecords = await prisma.payrollRecord.findMany({ where: { staffId: userId }, select: { id: true } });
          const payrollIds = payrollRecords.map(p => p.id);
          if (payrollIds.length > 0) {
            await prisma.payrollAllowance.deleteMany({ where: { payrollRecordId: { in: payrollIds } } });
            await prisma.payrollDeduction.deleteMany({ where: { payrollRecordId: { in: payrollIds } } });
          }
          await prisma.payrollRecord.deleteMany({ where: { staffId: userId } });

          // Clean up HR records
          await prisma.leaveRequest.deleteMany({ where: { staffId: userId, schoolId } });
          await prisma.loanRequest.deleteMany({ where: { staffId: userId } });
          await prisma.materialRequest.deleteMany({ where: { staffId: userId, schoolId } });
          await prisma.hRMessage.deleteMany({ where: { staffId: userId, schoolId } });
          await prisma.departmentResource.deleteMany({ where: { uploaderId: userId, schoolId } });

          // Nullify nullable references that point to this user
          await prisma.homeworkSubmission.updateMany({ where: { gradedBy: userId }, data: { gradedBy: null } });
          await prisma.feeRecord.updateMany({ where: { clearedBy: userId }, data: { clearedBy: null } });

          // Delete certificates and testimonials issued by this teacher
          // issuedBy is required (not nullable), so we must delete them
          await prisma.certificate.deleteMany({ where: { issuedBy: userId, schoolId } });
          await prisma.testimonial.deleteMany({ where: { issuedBy: userId, schoolId } });

          // Delete fee payments recorded by this teacher (recordedBy is required)
          await prisma.feePayment.deleteMany({ where: { recordedBy: userId, schoolId } });

          // Clean up push subscriptions
          await prisma.pushSubscription.deleteMany({ where: { userId, schoolId } });

          // Delete the Teacher profile record
          await prisma.teacher.delete({
            where: { id: teacherId, schoolId }
          });
        }
      } else if (user.role === 'parent' || user.Parent) {
        const parentId = user.Parent?.id;
        if (parentId) {
          await prisma.student.updateMany({ where: { parentId }, data: { parentId: null } });
          await prisma.parent.delete({ where: { id: parentId } });
        }
      }

      // Cleanup user-created records that might block deletion
      await prisma.newsEvent.deleteMany({ where: { authorId: userId, schoolId } });
      await prisma.notice.deleteMany({ where: { authorId: userId, schoolId } });
      await prisma.galleryImage.deleteMany({ where: { uploadedBy: userId, schoolId } });
      await prisma.nudge.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
      await prisma.department.updateMany({ where: { headId: userId }, data: { headId: null } });
      await prisma.pushSubscription.deleteMany({ where: { userId } });

      // Handle HR records for non-teacher staff (in case admin, sub_admin etc.)
      await prisma.leaveRequest.deleteMany({ where: { staffId: userId, schoolId } }).catch(() => {});
      await prisma.loanRequest.deleteMany({ where: { staffId: userId } }).catch(() => {});
      await prisma.materialRequest.deleteMany({ where: { staffId: userId, schoolId } }).catch(() => {});
      await prisma.hRMessage.deleteMany({ where: { staffId: userId, schoolId } }).catch(() => {});

      // Nullify processor references in HR records
      await prisma.leaveRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await prisma.loanRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await prisma.materialRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await prisma.hRMessage.updateMany({ where: { processedById: userId }, data: { processedById: null } });

      // Delete User
      await prisma.user.delete({
        where: {
          id: userId,
          schoolId
        }
      });
    });

    res.json({ message: 'User and related records deleted successfully' });

    // Log the deletion
    logAction({
      schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'USER',
      details: {
        deletedUserId: userId,
        role: user.role,
        username: user.username,
        forceDelete: !!force
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
router.post('/bulk-students', authenticate, authorize(['admin', 'sub_admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
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
            middleName: student.middleName || null,
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
