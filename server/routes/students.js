const express = require('express');
const router = express.Router();
const prisma = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { generateAdmissionNumber, getUniqueAdmissionNumber, isValidBloodGroup, isValidGenotype } = require('../utils/studentUtils');
const { generateStudentUsername, generateAutoEmail } = require('../utils/usernameGenerator');
const { createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');

// Use memory storage for Base64 DB persistence (survives Render's ephemeral filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper: convert buffer to data URI
function fileToBase64(file) {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
}

// ==========================================
// SPECIFIC ROUTES (Must come before /:id)
// ==========================================

// Get student by admission number or lookup
router.get('/lookup', authenticate, async (req, res) => {
  try {
    const { admissionNumber } = req.query;

    if (!admissionNumber) {
      return res.status(400).json({ error: 'Admission number is required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        admissionNumber,
        schoolId: parseInt(req.schoolId)
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true
          }
        },

        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error looking up student:', error);
    res.status(500).json({ error: 'Failed to lookup student' });
  }
});

// ========== STUDENT SELF-SERVICE ENDPOINTS ==========
// (These must be defined BEFORE /:id routes to avoid conflict)

// Get my profile (for logged-in student)
router.get('/my-profile', authenticate, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const student = await prisma.student.findFirst({
      where: {
        userId: parseInt(req.user.id),
        schoolId: parseInt(req.schoolId)
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            photoUrl: true
          }
        },
        classModel: {
          select: {
            id: true,
            name: true,
            arm: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update my profile (expanded fields - for logged-in student)
router.put('/my-profile', authenticate, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const {
      address,
      parentGuardianPhone,
      parentEmail,
      disability,
      nationality,
      stateOfOrigin,
      bloodGroup,
      genotype
    } = req.body;

    console.log('Update My Profile Request:', { userId: req.user.id, body: req.body });

    // Find student profile
    const existingStudent = await prisma.student.findFirst({
      where: {
        userId: req.user.id,
        schoolId: parseInt(req.schoolId)
      },
      include: { user: true }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Filter out undefined values and update allowed fields
    const dataToUpdate = {};
    if (address !== undefined) dataToUpdate.address = address;
    if (parentGuardianPhone !== undefined) dataToUpdate.parentGuardianPhone = parentGuardianPhone;
    if (parentEmail !== undefined) dataToUpdate.parentEmail = parentEmail;
    if (disability !== undefined) dataToUpdate.disability = disability;
    if (stateOfOrigin !== undefined) dataToUpdate.stateOfOrigin = stateOfOrigin;
    if (nationality !== undefined) dataToUpdate.nationality = nationality;
    if (bloodGroup !== undefined) dataToUpdate.bloodGroup = bloodGroup;
    if (genotype !== undefined) dataToUpdate.genotype = genotype;

    // Update only allowed fields in the Student model
    const updatedStudent = await prisma.student.update({
      where: {
        id: existingStudent.id,
        schoolId: parseInt(req.schoolId)
      },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        },
        classModel: {
          select: {
            id: true,
            name: true,
            arm: true
          }
        }
      }
    });

    res.json({
      message: 'Profile updated successfully',
      student: updatedStudent
    });

    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'STUDENT_PROFILE',
      details: { studentId: updatedStudent.id, fields: Object.keys(dataToUpdate) },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Student
router.delete('/:id', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure the student exists and belongs to the school
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(id),
        schoolId: parseInt(req.schoolId)
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Use a transaction to safely delete Student and User
    await prisma.$transaction(async (prisma) => {
      const studentId = parseInt(id);
      
      // Comprehensive manual cascade delete for student records
      const userId = student.userId;

      // 1. Delete all student-linked activity
      await prisma.attendanceRecord.deleteMany({ where: { studentId } });
      await prisma.quranRecord.deleteMany({ where: { studentId } });
      await prisma.cBTResult.deleteMany({ where: { studentId } });
      await prisma.homeworkSubmission.deleteMany({ where: { studentId } });
      await prisma.studentReportCard.deleteMany({ where: { studentId } });
      await prisma.intervention.deleteMany({ where: { studentId } });
      await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId } });
      await prisma.result.deleteMany({ where: { studentId } });
      
      // 2. Delete Fee Records & Online Payments
      // Order matters: Delete OnlinePayment first as it references FeeRecord
      await prisma.onlinePayment.deleteMany({ where: { studentId } });
      
      const feeRecords = await prisma.feeRecord.findMany({ where: { studentId }, select: { id: true } });
      const feeRecordIds = feeRecords.map(fr => fr.id);
      await prisma.feePayment.deleteMany({ where: { feeRecordId: { in: feeRecordIds } } });
      await prisma.feeRecord.deleteMany({ where: { studentId } });
      
      await prisma.examCard.deleteMany({ where: { studentId } });
      await prisma.promotionHistory.deleteMany({ where: { studentId } });
      await prisma.certificate.deleteMany({ where: { studentId } });
      await prisma.testimonial.deleteMany({ where: { studentId } });
      await prisma.alumni.deleteMany({ where: { studentId } });
      await prisma.parentTeacherMessage.deleteMany({ where: { studentId } });
      await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId } });

      // 3. Cleanup User-linked records (where student user is author/sender)
      if (userId) {
        await prisma.newsEvent.deleteMany({ where: { authorId: userId } });
        await prisma.notice.deleteMany({ where: { authorId: userId } });
        await prisma.galleryImage.deleteMany({ where: { uploadedBy: userId } });
        await prisma.nudge.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
        await prisma.department.updateMany({ where: { headId: userId }, data: { headId: null } });
      }

      if (userId) {
        // 4. Check if User has other profiles (Teacher/Parent) before deleting User record
        const fullUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { teacher: true, Parent: true }
        });

        if (fullUser?.teacher) {
          await prisma.teacherAssignment.deleteMany({ where: { teacherId: userId } });
          await prisma.teacher.delete({ where: { id: fullUser.teacher.id } });
        }
        if (fullUser?.Parent) {
          await prisma.parent.delete({ where: { id: fullUser.Parent.id } });
        }
      }

      // 5. Delete Student Profile
      await prisma.student.delete({ where: { id: studentId } });
      
      // 6. Delete User Account
      if (userId) {
        await prisma.user.delete({ where: { id: userId } });
      }
    });

    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'DELETE',
      resource: 'STUDENT',
      details: { studentId: id, admissionNumber: student.admissionNumber }
    });

    res.json({ message: 'Student and associated account deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    let errorMessage = 'Failed to delete student';
    if (error.code === 'P2003') {
      errorMessage = `Constraint Error: This student is linked to other records (Code: ${error.code}). Please check for historical records like messages or logs.`;
    } else {
      errorMessage = `Server Error: ${error.message || 'Unknown Error'}`;
    }
    res.status(500).json({ 
      error: errorMessage,
      code: error.code,
      meta: error.meta
    });
  }
});

// Create User Account for Legacy Student
router.post('/:id/create-account', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await prisma.student.findUnique({
      where: { 
        id: studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.user) {
      return res.status(400).json({ error: 'Student already has a user account' });
    }

    // Split student.name into first and last name if available
    let firstName = 'Student';
    let lastName = studentId.toString();

    if (student.name) {
      const names = student.name.trim().split(/\s+/);
      if (names.length > 0) firstName = names[0];
      if (names.length > 1) lastName = names.slice(1).join(' ');
    }

    // Fetch school code for username generation
    const school = await prisma.school.findUnique({
      where: { id: parseInt(req.schoolId) },
      select: { code: true }
    });

    // Generate professional username and admission number
    const generatedId = await generateStudentUsername(
      req.schoolId,
      school?.code || 'SCH',
      firstName,
      lastName
    );

    const username = generatedId.toLowerCase();
    const temporaryPassword = student.admissionNumber && !student.admissionNumber.startsWith('LEGACY-') 
      ? student.admissionNumber 
      : Math.random().toString(36).slice(-8).toUpperCase();

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Create user and link to student in a transaction
    const updatedStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId: parseInt(req.schoolId),
          username,
          passwordHash,
          role: 'student',
          firstName,
          lastName,
          email: student.parentEmail || (student.parentPhone ? student.parentPhone + '@edutech.com' : null)
        }
      });

      return await tx.student.update({
        where: { id: studentId },
        data: { 
          userId: user.id,
          // Update admission number if it was a legacy one
          admissionNumber: (student.admissionNumber?.startsWith('LEGACY-') || !student.admissionNumber) ? generatedId : student.admissionNumber
        },
        include: { user: true }
      });
    });

    res.json({
      message: 'Account created successfully',
      student: updatedStudent,
      credentials: {
        username,
        password: temporaryPassword
      }
    });

    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'CREATE_ACCOUNT',
      resource: 'STUDENT',
      details: { studentId, username },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create student account error:', error);
    res.status(500).json({ error: 'Failed to create student account' });
  }
});

// Upload my photo (for logged-in student) — Base64 DB storage
router.post('/my-photo', authenticate, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err);
      return res.status(400).json({ error: `Multer Error: ${err.message}` });
    } else if (err) {
      console.error('Unknown Upload Error:', err);
      return res.status(500).json({ error: `Upload Error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    const photo = req.file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(photo.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG are allowed.' });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(req.user.id) }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Convert to base64 data URI and store in DB
    const photoUrl = fileToBase64(photo);

    await prisma.student.update({
      where: {
        id: student.id,
        schoolId: parseInt(req.schoolId)
      },
      data: { photoUrl }
    });

    // Also update User model for centralized access
    await prisma.user.update({
      where: { id: req.user.id },
      data: { photoUrl }
    });

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl
    });

    // Log the photo upload
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'STUDENT_PHOTO',
      details: {
        studentId: student.id,
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete my photo (for logged-in student)
router.delete('/my-photo', authenticate, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    if (!student.photoUrl) {
      return res.status(400).json({ error: 'No photo to delete' });
    }

    // Update database (just set to null)
    await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl: null }
    });

    // Also clear from User model
    await prisma.user.update({
      where: { id: req.user.id },
      data: { photoUrl: null }
    });

    res.json({ message: 'Photo deleted successfully' });

    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'DELETE',
      resource: 'STUDENT_PHOTO',
      details: { studentId: student.id },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NAME RECOVERY MIGRATION
// ==========================================

// Recover missing firstName/lastName from legacy data (Admin/Principal only)
// GET  /api/students/fix-names         → dry-run preview
// POST /api/students/fix-names?apply=true → apply fixes
router.post('/fix-names', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const applyFixes = req.query.apply === 'true';
    const schoolIdInt = parseInt(req.schoolId);

    // Fetch all students for this school
    const students = await prisma.student.findMany({
      where: { schoolId: schoolIdInt },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true } }
      }
    });

    const school = await prisma.school.findUnique({ where: { id: schoolIdInt } });
    const schoolName = school?.name || 'School';
    const schoolCode = school?.code || 'SCH';

    const fixes = [];

    for (const student of students) {
      const currentFirst = (student.user?.firstName || '').trim();
      const currentLast = (student.user?.lastName || '').trim();

      let newFirst = currentFirst;
      let newLast = currentLast;
      let source = '';
      let needsAccount = !student.user;

      // Strategy 1: Parse the legacy student.name field (e.g. "Adam Ibrahim Lawal")
      const legacyName = (student.name || '').trim();
      if (legacyName && legacyName !== 'Student') {
        const parts = legacyName.split(/\s+/).filter(p => p.length > 0);
        if (parts.length >= 3) {
          if (!newFirst) newFirst = parts[0];
          if (!newLast) newLast = parts[parts.length - 1];
          source = `legacy name "${legacyName}"`;
        } else if (parts.length === 2) {
          if (!newFirst) newFirst = parts[0];
          if (!newLast) newLast = parts[1];
          source = `legacy name "${legacyName}"`;
        } else if (parts.length === 1) {
          if (!newFirst) newFirst = parts[0];
          source = `legacy name "${legacyName}"`;
        }
      }

      // Strategy 2: Extract surname from parentGuardianName if still missing
      if (!newLast && student.parentGuardianName && student.parentGuardianName.trim()) {
        const parentParts = student.parentGuardianName.trim().split(/\s+/);
        if (parentParts.length > 0) {
          newLast = parentParts[0];
          source = (source ? source + ' + ' : '') + `parent name "${student.parentGuardianName}"`;
        }
      }

      // Fallbacks
      if (!newFirst) newFirst = 'Student';
      if (!newLast) newLast = 'User';

      // Skip if nothing changed and account exists
      if (!needsAccount && newFirst === currentFirst && newLast === currentLast) continue;

      const fix = {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        before: { firstName: currentFirst || '(missing account)', lastName: currentLast || '(missing account)' },
        after: { firstName: newFirst, lastName: newLast },
        source,
        type: needsAccount ? 'CREATE_ACCOUNT' : 'UPDATE_NAMES'
      };

      if (applyFixes) {
        if (needsAccount) {
          // Create missing user account
          const uName = await generateStudentUsername(schoolIdInt, schoolCode, newFirst, newLast);
          const autoEmail = generateAutoEmail(newFirst, newLast, schoolName);
          const hashedPassword = await bcrypt.hash('student123', 10);

          const newUser = await prisma.user.create({
            data: {
              firstName: newFirst,
              lastName: newLast,
              email: autoEmail,
              username: uName.toLowerCase(),
              password: hashedPassword,
              role: 'student',
              schoolId: schoolIdInt,
              mustChangePassword: true
            }
          });

          await prisma.student.update({
            where: { id: student.id },
            data: { 
              userId: newUser.id,
              name: `${newFirst} ${student.middleName || ''} ${newLast}`.replace(/\s+/g, ' ').trim()
            }
          });
          fix.applied = true;
        } else {
          // Update existing account
          await prisma.user.update({
            where: { id: student.user.id },
            data: { firstName: newFirst, lastName: newLast }
          });
          
          await prisma.student.update({
            where: { id: student.id },
            data: { 
              name: `${newFirst} ${student.middleName || ''} ${newLast}`.replace(/\s+/g, ' ').trim()
            }
          });
          fix.applied = true;
        }
      }

      fixes.push(fix);
    }

    res.json({
      mode: applyFixes ? 'APPLIED' : 'DRY_RUN',
      totalStudents: students.length,
      fixesNeeded: fixes.length,
      fixes
    });

    if (applyFixes && fixes.length > 0) {
      logAction({
        schoolId: schoolIdInt,
        userId: req.user.id,
        action: 'MIGRATE',
        resource: 'STUDENT_ACCOUNTS',
        details: { fixCount: fixes.length },
        ipAddress: req.ip
      });
    }
  } catch (error) {
    console.error('Account recovery error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix Legacy Admission Numbers
router.post('/fix-admission-numbers', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const applyFixes = req.query.apply === 'true';
    const schoolIdInt = parseInt(req.schoolId);

    const school = await prisma.school.findUnique({ where: { id: schoolIdInt } });
    const schoolCode = school?.code || 'SCH';

    const students = await prisma.student.findMany({
      where: {
        schoolId: schoolIdInt,
        OR: [
          { admissionNumber: { contains: 'LEGACY' } },
          { NOT: { admissionNumber: { startsWith: schoolCode } } }
        ]
      },
      include: { user: true }
    });

    const fixes = [];
    for (const student of students) {
      const firstName = student.user?.firstName || student.name?.split(' ')[0] || 'Student';
      const lastName = student.user?.lastName || student.name?.split(' ').pop() || 'User';
      
      const newAdmissionNumber = await generateStudentUsername(schoolIdInt, schoolCode, firstName, lastName);
      
      const fix = {
        studentId: student.id,
        oldNumber: student.admissionNumber,
        newNumber: newAdmissionNumber
      };

      if (applyFixes) {
        await prisma.student.update({
          where: { id: student.id },
          data: { admissionNumber: newAdmissionNumber }
        });
        // Also update username if it was linked to the old number
        if (student.user && (student.user.username === student.admissionNumber.toLowerCase())) {
          await prisma.user.update({
            where: { id: student.user.id },
            data: { username: newAdmissionNumber.toLowerCase() }
          });
        }
        fix.applied = true;
      }
      fixes.push(fix);
    }

    res.json({
      mode: applyFixes ? 'APPLIED' : 'DRY_RUN',
      count: fixes.length,
      fixes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GENERAL ROUTES
// ==========================================

// Get all students with full details
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, status } = req.query;
    const where = { schoolId: parseInt(req.schoolId) };

    if (classId) {
      where.classId = parseInt(classId);
    }

    // Default to 'active' if no status is provided, 
    // but allow searching for others if explicitly requested
    if (status) {
      where.status = status;
    } else {
      where.status = 'active';
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            photoUrl: true
          }
        },
        classModel: true,
        parent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Patch: Ensure student.user exists to prevent frontend crashes
    const patchedStudents = students.map(student => ({
      ...student,
      user: student.user || { firstName: 'Student', lastName: '', id: 0, username: student.admissionNumber || 'unknown' }
    }));

    res.json(patchedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student by user ID
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        userId: parseInt(req.params.userId),
        schoolId: parseInt(req.schoolId)
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true
          }
        },
        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student by user ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single student by ID
// WARNING: This route catches /:id, so it must be AFTER /lookup and /my-profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(req.params.id),
        schoolId: parseInt(req.schoolId)
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true
          }
        },
        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create student with comprehensive information
router.post('/', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    console.log('Creating student with data:', {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      classId: req.body.classId
    });

    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      classId,
      admissionYear,
      // Personal Information
      dateOfBirth,
      gender,
      stateOfOrigin,
      nationality,
      address,
      // Parent/Guardian Information
      parentGuardianName,
      parentGuardianPhone,
      parentEmail,
      parentId,
      // Medical Information
      bloodGroup,
      genotype,
      disability,
      isScholarship,
      clubs
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !classId) {
      console.error('Validation error: Missing required fields');
      return res.status(400).json({ error: 'First name, last name, and class are required' });
    }

    // Fallback for parentGuardianName
    const effectiveParentName = parentGuardianName || `${lastName} Family`;

    // Validate blood group if provided
    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      return res.status(400).json({ error: 'Invalid blood group. Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-' });
    }

    // Validate genotype if provided
    if (genotype && !isValidGenotype(genotype)) {
      return res.status(400).json({ error: 'Invalid genotype. Must be one of: AA, AS, SS, AC, SC' });
    }

    // --- LICENSE & SCHOOL CODE CHECK ---
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });

    if (school && school.licenseKey) {
      const license = await prisma.license.findUnique({
        where: { licenseKey: school.licenseKey }
      });
      if (license && license.maxStudents !== -1) {
        const currentCount = await prisma.student.count({
          where: { schoolId: parseInt(req.schoolId) }
        });
        if (currentCount >= license.maxStudents) {
          return res.status(403).json({
            error: `Student limit reached. Your ${license.packageType} license allows maximum ${license.maxStudents} students. Please upgrade.`
          });
        }
      }
    }
    const schoolCode = school?.code || 'SCH';
    // ---------------------

    // Get class information for admission number
    let className = '';
    let classArm = '';
    if (classId) {
      const classInfo = await prisma.class.findFirst({
        where: {
          id: parseInt(classId),
          schoolId: parseInt(req.schoolId)
        }
      });
      if (classInfo) {
        className = classInfo.name;
        classArm = classInfo.arm || '';
      }
    }

    // Generate unique student username / admission number
    const uniqueAdmissionNumber = await generateStudentUsername(
      req.schoolId,
      schoolCode,
      firstName,
      lastName,
      admissionYear || new Date().getFullYear()
    );

    // Sync username with admission number
    const username = uniqueAdmissionNumber.toLowerCase();

    const defaultPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const generatedEmail = email || generateAutoEmail(firstName, lastName, school?.name);

    // Create user account
    const user = await prisma.user.create({
      data: {
        schoolId: parseInt(req.schoolId),
        firstName,
        lastName,
        username,
        email: generatedEmail,
        passwordHash: hashedPassword,
        role: 'student',
        mustChangePassword: false
      }
    });

    // Create student profile
    const student = await prisma.student.create({
      data: {
        schoolId: parseInt(req.schoolId),
        userId: user.id,
        admissionNumber: uniqueAdmissionNumber,
        classId: classId ? parseInt(classId) : null,
        middleName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        stateOfOrigin,
        nationality: nationality || 'Nigerian',
        address,
        parentGuardianName: effectiveParentName,
        parentGuardianPhone,
        parentEmail,
        parentId: parentId ? parseInt(parentId) : null,
        bloodGroup,
        genotype,
        disability: disability || 'None',
        name: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
        rollNo: uniqueAdmissionNumber,
        isScholarship: isScholarship === 'true' || isScholarship === true,
        clubs
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        },
        classModel: true
      }
    });

    // Create fee record
    if (classId) {
      const sId = Number(req.schoolId);
      const cId = Number(classId);

      const currentTerm = await prisma.term.findFirst({
        where: {
          isCurrent: true,
          schoolId: sId
        },
        include: { academicSession: true }
      });

      if (currentTerm) {
        const feeStructure = await prisma.classFeeStructure.findFirst({
          where: {
            classId: cId,
            termId: currentTerm.id,
            academicSessionId: currentTerm.academicSessionId,
            schoolId: sId
          }
        });

        // Use centralized utility for fee initialization
        await createOrUpdateFeeRecordWithOpening({
          schoolId: sId,
          studentId: student.id,
          termId: currentTerm.id,
          academicSessionId: currentTerm.academicSessionId,
          expectedAmount: (isScholarship === 'true' || isScholarship === true) ? 0 : (feeStructure?.amount || 0),
          paidAmount: 0
        });
      }
    }
    // 5. Send welcome email (non-blocking)
    const targetEmail = parentEmail || (email && !email.includes('@student.darulquran.edu') ? email : null);

    if (targetEmail) {
      const { sendWelcomeEmail } = require('../services/emailService');

      try {
        const settings = await prisma.school.findUnique({
          where: { id: req.schoolId }
        });
        const schoolName = settings?.name || process.env.SCHOOL_NAME || 'School Management System';

        const welcomeData = {
          parentEmail: targetEmail,
          studentName: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
          admissionNumber: uniqueAdmissionNumber,
          className: className ? `${className} ${classArm || ''}`.trim() : 'New Admission',
          loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
          schoolName
        };

        sendWelcomeEmail(welcomeData).catch(e => console.error('Welcome email error:', e));
      } catch (err) {
        console.error('Error initiating welcome email:', err);
      }
    }

    // NEW: Send Welcome SMS (non-blocking)
    if (parentGuardianPhone) {
      const { sendWelcomeSMS } = require('../services/smsService');
      try {
        const settings = await prisma.school.findUnique({
          where: { id: req.schoolId }
        });
        const schoolName = settings?.name || process.env.SCHOOL_NAME || 'School Management System';

        const welcomeData = {
          phone: parentGuardianPhone,
          studentName: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
          admissionNumber: uniqueAdmissionNumber,
          loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
          schoolName
        };

        sendWelcomeSMS(welcomeData).catch(e => console.error('Welcome SMS error:', e));
      } catch (err) {
        console.error('Error initiating welcome SMS:', err);
      }
    }

    res.status(201).json({
      message: 'Student created successfully',
      student,
      credentials: {
        username,
        password: defaultPassword,
        admissionNumber: uniqueAdmissionNumber,
        mustChangePassword: !password
      }
    });

    // Log student creation
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'CREATE',
      resource: 'STUDENT',
      details: {
        studentId: student.id,
        admissionNumber: uniqueAdmissionNumber,
        classId: student.classId,
        name: student.name
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update student (Admin/Principal)
// WARNING: This route catches /:id, so it must be AFTER /my-profile
router.put('/:id', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      classId,
      dateOfBirth,
      gender,
      stateOfOrigin,
      nationality,
      address,
      photoUrl,
      parentGuardianName,
      parentGuardianPhone,
      parentEmail,
      parentId,
      bloodGroup,
      genotype,
      disability,
      isScholarship,
      isExamRestricted,
      examRestrictionReason,
      clubs,
      admissionNumber
    } = req.body;

    const studentId = parseInt(req.params.id);

    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { user: true }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if new admission number is already taken
    if (admissionNumber && admissionNumber !== existingStudent.admissionNumber) {
      const duplicate = await prisma.student.findFirst({
        where: {
          admissionNumber,
          schoolId: parseInt(req.schoolId),
          NOT: { id: studentId }
        }
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Admission number already taken' });
      }
    }

    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      return res.status(400).json({ error: 'Invalid blood group' });
    }

    if (genotype && !isValidGenotype(genotype)) {
      return res.status(400).json({ error: 'Invalid genotype' });
    }

    if (firstName || lastName || email || photoUrl) {
      if (existingStudent.userId) {
        // Update existing user account
        await prisma.user.update({
          where: {
            id: existingStudent.userId,
            schoolId: parseInt(req.schoolId)
          },
          data: {
            ...(firstName !== undefined && { firstName: firstName.trim() }),
            ...(lastName !== undefined && { lastName: lastName.trim() }),
            ...(email !== undefined && { email: email.trim() || null }),
            ...(photoUrl !== undefined && { photoUrl })
          }
        });
      } else {
        // CREATE missing user account for legacy student
        const school = await prisma.school.findUnique({
          where: { id: parseInt(req.schoolId) }
        });
        const schoolCode = school?.code || 'SCH';
        
        const fName = firstName || existingStudent.name?.split(' ')[0] || 'Student';
        const lName = lastName || existingStudent.name?.split(' ').pop() || 'User';
        const uName = await generateStudentUsername(parseInt(req.schoolId), schoolCode, fName, lName);
        const autoEmail = generateAutoEmail(fName, lName, school?.name || 'School');
        const hashedPassword = await bcrypt.hash('student123', 10);

        const newUser = await prisma.user.create({
          data: {
            firstName: fName,
            lastName: lName,
            email: email || autoEmail,
            username: uName.toLowerCase(),
            passwordHash: hashedPassword,
            role: 'student',
            schoolId: parseInt(req.schoolId),
            photoUrl: photoUrl || null,
            mustChangePassword: true
          }
        });

        // Link the new user to the student
        await prisma.student.update({
          where: { id: studentId },
          data: { userId: newUser.id }
        });
        
        console.log(`Created missing user account for legacy student ${studentId}: ${uName}`);
      }
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      },
      data: {
        ...(admissionNumber && { admissionNumber }),
        ...(classId && { classId: parseInt(classId) }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(stateOfOrigin && { stateOfOrigin }),
        ...(nationality && { nationality }),
        ...(address && { address }),
        ...(photoUrl && { photoUrl }),
        ...(middleName !== undefined && { middleName }),
        ...(parentGuardianName && { parentGuardianName }),
        ...(parentGuardianPhone && { parentGuardianPhone }),
        ...(parentEmail && { parentEmail }),
        ...(parentId !== undefined && { parentId: parentId ? parseInt(parentId) : null }),
        ...(bloodGroup && { bloodGroup }),
        ...(genotype && { genotype }),
        ...(disability && { disability }),
        ...(isScholarship !== undefined && { isScholarship: isScholarship === 'true' || isScholarship === true }),
        ...(isExamRestricted !== undefined && { isExamRestricted: isExamRestricted === 'true' || isExamRestricted === true }),
        ...(examRestrictionReason !== undefined && { examRestrictionReason }),
        // Update full name if any component changed
        ...((firstName !== undefined || lastName !== undefined || middleName !== undefined) && {
          name: `${firstName !== undefined ? firstName : (existingStudent.user?.firstName || existingStudent.name?.split(' ')[0] || '')} ${middleName !== undefined ? middleName : (existingStudent.middleName || '')} ${lastName !== undefined ? lastName : (existingStudent.user?.lastName || existingStudent.name?.split(' ').pop() || '')}`.replace(/\s+/g, ' ').trim()
        }),
        ...(clubs && { clubs })
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classModel: true
      }
    });

    // Sync fee record if scholarship status changed
    if (isScholarship !== undefined) {
      const isScholarshipBool = isScholarship === 'true' || isScholarship === true;
      const currentTerm = await prisma.term.findFirst({
        where: { isCurrent: true, schoolId: parseInt(req.schoolId) }
      });

      if (currentTerm) {
        const feeRecord = await prisma.feeRecord.findUnique({
          where: {
            schoolId_studentId_termId_academicSessionId: {
              schoolId: parseInt(req.schoolId),
              studentId: studentId,
              termId: currentTerm.id,
              academicSessionId: currentTerm.academicSessionId
            }
          }
        });

        if (feeRecord) {
          let newExpected = feeRecord.expectedAmount;
          if (isScholarshipBool) {
            newExpected = 0;
          } else {
            // If removed from scholarship, get class fee structure
            const feeStructure = await prisma.classFeeStructure.findFirst({
              where: {
                classId: updatedStudent.classId,
                termId: currentTerm.id,
                academicSessionId: currentTerm.academicSessionId,
                schoolId: parseInt(req.schoolId)
              }
            });
            if (feeStructure) {
              newExpected = feeStructure.amount;
            }
          }

          if (newExpected !== feeRecord.expectedAmount) {
            await prisma.feeRecord.update({
              where: { id: feeRecord.id },
              data: {
                expectedAmount: newExpected,
                balance: newExpected - feeRecord.paidAmount
              }
            });
          }
        }
      }
    }

    res.json({
      message: 'Student updated successfully',
      student: updatedStudent
    });

    // Log student update
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'STUDENT',
      details: {
        studentId: studentId,
        updates: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete student
router.delete('/:id', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.$transaction(async (prisma) => {
      // Delete all related records to avoid foreign key constraints
      await prisma.result.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.attendanceRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.quranRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.promotionHistory.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.cBTResult.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.homeworkSubmission.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.intervention.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.onlinePayment.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.studentReportCard.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.certificate.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.testimonial.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      await prisma.examCard.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });
      
      // Handle FeePayments separately as they link via FeeRecord
      const feeRecords = await prisma.feeRecord.findMany({
        where: { studentId, schoolId: parseInt(req.schoolId) },
        select: { id: true }
      });
      const feeRecordIds = feeRecords.map(fr => fr.id);
      
      if (feeRecordIds.length > 0) {
        await prisma.feePayment.deleteMany({ 
          where: { feeRecordId: { in: feeRecordIds }, schoolId: parseInt(req.schoolId) } 
        });
      }
      
      await prisma.feeRecord.deleteMany({ where: { studentId, schoolId: parseInt(req.schoolId) } });

      // Finally delete student and user
      await prisma.student.delete({
        where: {
          id: studentId,
          schoolId: parseInt(req.schoolId)
        }
      });

      if (student.userId) {
        await prisma.user.delete({
          where: {
            id: student.userId,
            schoolId: parseInt(req.schoolId)
          }
        });
      }
    });

    res.json({ message: 'Student deleted successfully' });

    // Log student deletion
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'DELETE',
      resource: 'STUDENT',
      details: {
        studentId: studentId,
        admissionNumber: student.admissionNumber,
        userId: student.userId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Parent Account from Student Details
router.post('/:id/create-parent', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // 1. Find student with parent details
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.parentId) {
      return res.status(400).json({ error: 'Student already has a linked parent account' });
    }

    if (!student.parentGuardianPhone || !student.parentGuardianName) {
      return res.status(400).json({ error: 'Parent details (Name and Phone) are missing from student record' });
    }

    const phone = student.parentGuardianPhone.replace(/\s+/g, '');
    const fullName = student.parentGuardianName;
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Parent';

    // 2. Check if a user with this phone number already exists in this school
    let isNew = false;
    let user = null;
    let parent = null;
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check if user exists by phone/username
        const existingUser = await tx.user.findFirst({
          where: {
            schoolId: student.schoolId, // Use student's schoolId
            username: phone
          }
        });

        // 2. Create/Update User
        const userData = {
          schoolId: student.schoolId,
          firstName,
          lastName,
          email: student.parentEmail || `${phone}@parent.school`,
          username: phone,
          passwordHash: await bcrypt.hash('parent123', 10),
          role: 'parent',
          isActive: true
        };

        const finalUser = await tx.user.upsert({
          where: {
            schoolId_username: {
              schoolId: student.schoolId,
              username: phone
            }
          },
          update: { role: 'parent' }, 
          create: userData
        });

        if (!existingUser) isNew = true;

        // 3. Create/Update Parent Profile
        const finalParent = await tx.parent.upsert({
          where: { userId: finalUser.id },
          update: { phone: phone, address: student.address || '', schoolId: student.schoolId },
          create: {
            schoolId: student.schoolId,
            userId: finalUser.id,
            phone: phone,
            address: student.address || ''
          }
        });

        // 4. Link student
        await tx.student.update({
          where: { id: studentId },
          data: { parentId: finalParent.id }
        });

        // 5. AUTO-FIX: Create student user account if missing
        if (!student.userId) {
          console.log(`[Auto-Fix] Creating user account for student ${student.id} during parent creation`);
          const studentUsername = student.admissionNumber || `std${student.id}`;
          const studentPasswordHash = await bcrypt.hash('123456', 10);
          
          const studentUser = await tx.user.create({
            data: {
              schoolId: student.schoolId,
              username: studentUsername,
              passwordHash: studentPasswordHash,
              firstName: student.user?.firstName || student.name.split(' ')[0],
              lastName: student.user?.lastName || student.name.split(' ').slice(1).join(' ') || 'Student',
              role: 'student',
              isActive: true
            }
          });

          await tx.student.update({
            where: { id: studentId },
            data: { userId: studentUser.id }
          });
        }

        return { 
          user: finalUser, 
          parent: finalParent,
          credentials: {
            username: phone,
            password: 'parent123'
          }
        };
      });

      user = result.user;
      parent = result.parent;
    } catch (error) {
      console.error('Failed to create/link parent in transaction:', error);
      return res.status(500).json({ error: 'System error while linking parent. Please check if this phone number is already used in another school.' });
    }

    // 5. Log Action
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: isNew ? 'CREATE' : 'LINK',
      resource: 'PARENT_ACCOUNT',
      details: {
        studentId,
        parentId: parent.id,
        phone,
        message: isNew ? 'Auto-created from student record' : 'Linked to existing parent account (sibling detection)'
      },
      ipAddress: req.ip
    });

    res.json({
      message: isNew ? 'Parent account created successfully' : 'Student linked to existing parent account',
      isNewAccount: isNew,
      credentials: {
        username: phone,
        password: isNew ? 'parent123' : '(Existing Password)'
      }
    });

  } catch (error) {
    console.error('Error auto-creating parent:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
