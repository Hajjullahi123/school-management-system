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
const { generateStudentUsername } = require('../utils/usernameGenerator');
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
        schoolId: req.schoolId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            photoUrl: true
          }
        },
        middleName: true,
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
        schoolId: req.schoolId
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
        schoolId: req.schoolId
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
        schoolId: req.schoolId
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
      schoolId: req.schoolId,
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
    const student = await prisma.student.findUnique({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Use a transaction to safely delete Student and User
    await prisma.$transaction(async (prisma) => {
      const studentId = parseInt(id);
      
      // Comprehensive manual cascade delete for student records
      await prisma.attendanceRecord.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.quranRecord.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.quranTarget.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.cbtResult.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.homeworkSubmission.deleteMany({ where: { studentId } });
      await prisma.psychomotorDomain.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.studentReportCard.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.intervention.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.miscellaneousFeePayment.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.result.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      // Delete Fee Payments first (requires fetching fee record IDs)
      const feeRecords = await prisma.feeRecord.findMany({ where: { studentId, schoolId: req.schoolId }, select: { id: true } });
      const feeRecordIds = feeRecords.map(fr => fr.id);
      await prisma.feePayment.deleteMany({ where: { feeRecordId: { in: feeRecordIds }, schoolId: req.schoolId } });
      await prisma.feeRecord.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.examCard.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.promotionHistory.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.onlinePayment.deleteMany({ where: { studentId, schoolId: req.schoolId } });
      await prisma.certificate.deleteMany({ where: { studentId } });
      await prisma.testimonial.deleteMany({ where: { studentId } });
      await prisma.alumni.deleteMany({ where: { studentId, schoolId: req.schoolId } });

      // Cleanup user-created records that might block deletion of the User account
      const userId = student.userId;
      await prisma.newsEvent.deleteMany({ where: { authorId: userId, schoolId: req.schoolId } });
      await prisma.notice.deleteMany({ where: { authorId: userId, schoolId: req.schoolId } });
      await prisma.galleryImage.deleteMany({ where: { uploadedBy: userId, schoolId: req.schoolId } });
      await prisma.nudge.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
      await prisma.department.updateMany({ where: { headId: userId }, data: { headId: null } });

      await prisma.student.delete({
        where: { id: studentId }
      });
      
      await prisma.user.delete({
        where: { id: userId }
      });
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'STUDENT',
      details: { studentId: id, admissionNumber: student.admissionNumber }
    });

    res.json({ message: 'Student and associated account deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
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
        schoolId: req.schoolId
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
      schoolId: req.schoolId,
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
      schoolId: req.schoolId,
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
// GENERAL ROUTES
// ==========================================

// Get all students with full details
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, status } = req.query;
    const where = { schoolId: req.schoolId };

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
            role: true,
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
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(students);
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
        schoolId: req.schoolId
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
        schoolId: req.schoolId
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
          where: { schoolId: req.schoolId }
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
          schoolId: req.schoolId
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

    const uniqueEmailPrefix = email || `${uniqueAdmissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

    // Create user account
    const user = await prisma.user.create({
      data: {
        schoolId: req.schoolId,
        firstName,
        lastName,
        username,
        email: email || `${uniqueEmailPrefix}@student.darulquran.edu`,
        passwordHash: hashedPassword,
        role: 'student',
        mustChangePassword: false
      }
    });

    // Create student profile
    const student = await prisma.student.create({
      data: {
        schoolId: req.schoolId,
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
      schoolId: req.schoolId,
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
      bloodGroup,
      genotype,
      disability,
      isScholarship,
      isExamRestricted,
      examRestrictionReason,
      clubs
    } = req.body;

    const studentId = parseInt(req.params.id);

    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: req.schoolId
      },
      include: { user: true }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      return res.status(400).json({ error: 'Invalid blood group' });
    }

    if (genotype && !isValidGenotype(genotype)) {
      return res.status(400).json({ error: 'Invalid genotype' });
    }

    if (firstName || lastName || email || photoUrl) {
      await prisma.user.update({
        where: {
          id: existingStudent.userId,
          schoolId: req.schoolId
        },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          ...(photoUrl && { photoUrl })
        }
      });
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId,
        schoolId: req.schoolId
      },
      data: {
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
        ...(bloodGroup && { bloodGroup }),
        ...(genotype && { genotype }),
        ...(disability && { disability }),
        ...(isScholarship !== undefined && { isScholarship: isScholarship === 'true' || isScholarship === true }),
        ...(isExamRestricted !== undefined && { isExamRestricted: isExamRestricted === 'true' || isExamRestricted === true }),
        ...(examRestrictionReason !== undefined && { examRestrictionReason }),
        // Update full name if any component changed
        ...((firstName || lastName || middleName !== undefined) && {
          name: `${firstName || existingStudent.user.firstName} ${middleName !== undefined ? middleName : (existingStudent.middleName || '')} ${lastName || existingStudent.user.lastName}`.replace(/\s+/g, ' ').trim()
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
        where: { isCurrent: true, schoolId: req.schoolId }
      });

      if (currentTerm) {
        const feeRecord = await prisma.feeRecord.findUnique({
          where: {
            schoolId_studentId_termId_academicSessionId: {
              schoolId: req.schoolId,
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
                schoolId: req.schoolId
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
      schoolId: req.schoolId,
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
        schoolId: req.schoolId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.$transaction(async (prisma) => {
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

      await prisma.user.delete({
        where: {
          id: student.userId,
          schoolId: req.schoolId
        }
      });
    });

    res.json({ message: 'Student deleted successfully' });

    // Log student deletion
    logAction({
      schoolId: req.schoolId,
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
        schoolId: req.schoolId
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
    let user = await prisma.user.findFirst({
      where: {
        username: phone,
        schoolId: req.schoolId
      }
    });

    let isNew = false;
    let parent = null;

    if (user) {
      // User exists, find associated parent
      parent = await prisma.parent.findUnique({
        where: { userId: user.id }
      });

      if (!parent) {
        // User exists but has no parent profile (e.g. they were only a staff member)
        parent = await prisma.parent.create({
          data: {
            schoolId: req.schoolId,
            userId: user.id,
            phone: phone,
            address: student.address
          }
        });
        isNew = true; // Still "new" in terms of parent access
      }
    } else {
      // 3. Create new User + Parent
      isNew = true;
      const passwordHash = await bcrypt.hash('123456', 10);

      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            schoolId: req.schoolId,
            username: phone,
            passwordHash,
            firstName,
            lastName,
            role: 'parent',
            isActive: true,
            mustChangePassword: false,
            email: student.parentEmail || `${phone}@parent.school`
          }
        });

        const newParent = await tx.parent.create({
          data: {
            schoolId: req.schoolId,
            userId: newUser.id,
            phone: phone,
            address: student.address
          }
        });

        return { user: newUser, parent: newParent };
      });

      user = result.user;
      parent = result.parent;
    }

    // 4. Link student to parent
    await prisma.student.update({
      where: { id: studentId },
      data: { parentId: parent.id }
    });

    // 5. Log Action
    logAction({
      schoolId: req.schoolId,
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
        password: isNew ? '123456' : '(Existing Password)'
      }
    });

  } catch (error) {
    console.error('Error auto-creating parent:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
