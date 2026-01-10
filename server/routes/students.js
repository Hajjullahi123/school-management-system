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

// Configure multer for student photo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/students');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
            email: true
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
        schoolId: req.schoolId
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
      firstName, // Student might want to suggest a fix, but usually read-only. Let's allow middleName.
      middleName,
      lastName,
      address,
      parentGuardianPhone,
      parentEmail,
      disability,
      dateOfBirth,
      gender,
      stateOfOrigin,
      nationality,
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
    if (middleName !== undefined) {
      dataToUpdate.middleName = middleName;
      // Also update the full name field in Student model
      const firstName = existingStudent.user?.firstName || '';
      const lastName = existingStudent.user?.lastName || '';
      dataToUpdate.name = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
    }
    if (address !== undefined) dataToUpdate.address = address;
    if (parentGuardianPhone !== undefined) dataToUpdate.parentGuardianPhone = parentGuardianPhone;
    if (parentEmail !== undefined) dataToUpdate.parentEmail = parentEmail;
    if (disability !== undefined) dataToUpdate.disability = disability;
    if (gender !== undefined) dataToUpdate.gender = gender;
    if (stateOfOrigin !== undefined) dataToUpdate.stateOfOrigin = stateOfOrigin;
    if (nationality !== undefined) dataToUpdate.nationality = nationality;
    if (bloodGroup !== undefined) dataToUpdate.bloodGroup = bloodGroup;
    if (genotype !== undefined) dataToUpdate.genotype = genotype;

    // Handle dateOfBirth specifically
    if (dateOfBirth !== undefined) {
      dataToUpdate.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

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
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload my photo (for logged-in student)
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
    console.log('--- PHOTO UPLOAD DEBUG ---');
    console.log('User Role:', req.user.role);
    console.log('User ID:', req.user.id);
    console.log('File:', req.file ? req.file.filename : 'MISSING');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers['content-type']);

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
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG are allowed.' });
    }

    // Validate file size (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      if (req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(req.user.id) }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Generate unique filename
    const filename = photo.filename;

    // Delete old photo if exists
    if (student.photoUrl) {
      try {
        // Construct absolute path to the old file
        // student.photoUrl is like "/uploads/students/file.jpg"
        // We need to remove the leading slash to join correctly if valid
        const relativePath = student.photoUrl.startsWith('/') ? student.photoUrl.substring(1) : student.photoUrl;
        const oldPhotoPath = path.join(__dirname, '..', relativePath);

        console.log('Attempting to delete old photo:', oldPhotoPath);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        } else {
          console.log('Old photo file not found:', oldPhotoPath);
        }
      } catch (deleteError) {
        console.warn('Failed to delete old photo (proceeding with upload):', deleteError);
      }
    }

    // Update database
    // FORCE forward slashes for URL path, even on Windows
    const photoUrl = `/uploads/students/${filename}`;

    await prisma.student.update({
      where: {
        id: student.id,
        schoolId: req.schoolId
      },
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
        photoUrl
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

    // Delete photo file
    const fs = require('fs');
    const path = require('path');
    const photoPath = path.join(__dirname, '..', student.photoUrl);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    // Update database
    await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl: null }
    });

    res.json({ message: 'Photo deleted successfully' });
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
    const { classId } = req.query;
    const where = { schoolId: req.schoolId };

    if (classId) {
      where.classId = parseInt(classId);
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
            email: true
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
            email: true
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
router.post('/', authenticate, authorize('admin'), async (req, res) => {
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

    // Validate blood group if provided
    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      return res.status(400).json({ error: 'Invalid blood group. Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-' });
    }

    // Validate genotype if provided
    if (genotype && !isValidGenotype(genotype)) {
      return res.status(400).json({ error: 'Invalid genotype. Must be one of: AA, AS, SS, AC, SC' });
    }

    // --- LICENSE CHECK ---
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

    // Generate admission number
    const baseAdmissionNumber = generateAdmissionNumber(
      admissionYear || new Date().getFullYear(),
      className || 'NEW',
      classArm,
      firstName,
      lastName
    );

    // Ensure admission number is unique
    const uniqueAdmissionNumber = await getUniqueAdmissionNumber(prisma, baseAdmissionNumber, classId, req.schoolId);

    // Generate username
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const classCode = className ? `${className.replace(/\s+/g, '')}${classArm || ''}` : 'NEW';
    const session = admissionYear || new Date().getFullYear();
    const generatedUsername = `${initials}-${classCode}-${session}`;

    let username = generatedUsername;
    let counter = 1;
    while (await prisma.user.findFirst({ where: { username, schoolId: req.schoolId } })) {
      username = `${generatedUsername}-${counter}`;
      counter++;
    }

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
        mustChangePassword: !password
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
        parentGuardianName,
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
      const currentTerm = await prisma.term.findFirst({
        where: {
          isCurrent: true,
          schoolId: req.schoolId
        },
        include: { academicSession: true }
      });

      if (currentTerm) {
        const feeStructure = await prisma.classFeeStructure.findFirst({
          where: {
            classId: parseInt(classId),
            termId: currentTerm.id,
            academicSessionId: currentTerm.academicSessionId,
            schoolId: req.schoolId
          }
        });

        if (feeStructure) {
          const expectedAmount = isScholarship === 'true' || isScholarship === true ? 0 : feeStructure.amount;
          await prisma.feeRecord.create({
            data: {
              schoolId: req.schoolId,
              studentId: student.id,
              termId: currentTerm.id,
              academicSessionId: currentTerm.academicSessionId,
              expectedAmount,
              paidAmount: 0,
              balance: expectedAmount,
              isClearedForExam: true
            }
          });
        }
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

// Update student (Admin)
// WARNING: This route catches /:id, so it must be AFTER /my-profile
router.put('/:id', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
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

    if (firstName || lastName || email) {
      await prisma.user.update({
        where: {
          id: existingStudent.userId,
          schoolId: req.schoolId
        },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email })
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
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
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

module.exports = router;
