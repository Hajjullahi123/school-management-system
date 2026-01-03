const express = require('express');
const router = express.Router();
const prisma = require('../db');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { generateAdmissionNumber, getUniqueAdmissionNumber, isValidBloodGroup, isValidGenotype } = require('../utils/studentUtils');

// Get all students with full details
// Get student by admission number or lookup
router.get('/lookup', authenticate, async (req, res) => {
  try {
    const { admissionNumber } = req.query;

    if (!admissionNumber) {
      return res.status(400).json({ error: 'Admission number is required' });
    }

    const student = await prisma.student.findUnique({
      where: { admissionNumber },
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

// Get all students with full details
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId } = req.query;
    const where = {};

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
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(req.params.userId) },
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

// Get single student
router.get('/:id', authenticate, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
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
      disability
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      console.error('Validation error: Missing required fields');
      return res.status(400).json({ error: 'First name and last name are required' });
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
    // Check if school has reached student limit
    const settings = await prisma.schoolSettings.findFirst();
    if (settings && settings.licenseKey) {
      // Find the specific license to check limits
      const license = await prisma.license.findUnique({
        where: { licenseKey: settings.licenseKey }
      });

      if (license && license.maxStudents !== -1) {
        // Count excluding the new one
        const currentCount = await prisma.student.count();
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
      const classInfo = await prisma.class.findUnique({
        where: { id: parseInt(classId) }
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
    const uniqueAdmissionNumber = await getUniqueAdmissionNumber(prisma, baseAdmissionNumber, classId);

    // Generate username: initials + class + session (e.g., JD-JSS1A-2025)
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const classCode = className ? `${className.replace(/\s+/g, '')}${classArm || ''}` : 'NEW';
    const session = admissionYear || new Date().getFullYear();
    const generatedUsername = `${initials}-${classCode}-${session}`;

    // Ensure username is unique
    let username = generatedUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${generatedUsername}-${counter}`;
      counter++;
    }

    // Default password is 123456, user must change on first login
    const defaultPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    console.log('Generated credentials:', { username, admissionNumber: uniqueAdmissionNumber });

    // Generate unique email (use timestamp + random to ensure uniqueness)
    const uniqueEmailPrefix = email || `${uniqueAdmissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

    // Create user account
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username,
        email: email || `${uniqueEmailPrefix}@student.darulquran.edu`,
        passwordHash: hashedPassword,
        role: 'student',
        mustChangePassword: !password // If no password provided, force change
      }
    });

    // Create student profile
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        admissionNumber: uniqueAdmissionNumber,
        classId: classId ? parseInt(classId) : null,
        // Personal Information
        middleName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        stateOfOrigin,
        nationality: nationality || 'Nigerian',
        address,
        // Parent/Guardian Information
        parentGuardianName,
        parentGuardianPhone,
        parentEmail,
        // Medical Information
        bloodGroup,
        genotype,
        disability: disability || 'None',
        // Legacy fields for compatibility
        name: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
        rollNo: uniqueAdmissionNumber
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

    // Check for active fee structure and create fee record
    if (classId) {
      // Find current term and session
      const currentTerm = await prisma.term.findFirst({
        where: { isCurrent: true },
        include: { academicSession: true }
      });

      if (currentTerm) {
        const feeStructure = await prisma.classFeeStructure.findUnique({
          where: {
            classId_termId_academicSessionId: {
              classId: parseInt(classId),
              termId: currentTerm.id,
              academicSessionId: currentTerm.academicSessionId
            }
          }
        });

        if (feeStructure) {
          await prisma.feeRecord.create({
            data: {
              studentId: student.id,
              termId: currentTerm.id,
              academicSessionId: currentTerm.academicSessionId,
              expectedAmount: feeStructure.amount,
              paidAmount: 0,
              balance: feeStructure.amount,
              isClearedForExam: false
            }
          });
        }
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
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update student
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      classId,
      // Personal Information
      dateOfBirth,
      gender,
      stateOfOrigin,
      nationality,
      address,
      photoUrl,
      // Parent/Guardian Information
      parentGuardianName,
      parentGuardianPhone,
      parentEmail,
      // Medical Information
      bloodGroup,
      genotype,
      disability
    } = req.body;

    const studentId = parseInt(req.params.id);

    // Get existing student
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Validate blood group if provided
    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      return res.status(400).json({ error: 'Invalid blood group' });
    }

    // Validate genotype if provided
    if (genotype && !isValidGenotype(genotype)) {
      return res.status(400).json({ error: 'Invalid genotype' });
    }

    // Update user information
    if (firstName || lastName || email) {
      await prisma.user.update({
        where: { id: existingStudent.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email })
        }
      });
    }

    // Update student profile
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...(classId && { classId: parseInt(classId) }),
        // Personal Information
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(stateOfOrigin && { stateOfOrigin }),
        ...(nationality && { nationality }),
        ...(address && { address }),
        ...(photoUrl && { photoUrl }),
        // Parent/Guardian Information
        ...(parentGuardianName && { parentGuardianName }),
        ...(parentGuardianPhone && { parentGuardianPhone }),
        ...(parentEmail && { parentEmail }),
        // Medical Information
        ...(bloodGroup && { bloodGroup }),
        ...(genotype && { genotype }),
        ...(disability && { disability }),
        // Update legacy name field
        ...(firstName && lastName && { name: `${firstName} ${lastName}` })
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

    res.json({
      message: 'Student updated successfully',
      student: updatedStudent
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

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Manual Cascade Delete for related records
    await prisma.$transaction(async (prisma) => {
      // Delete related student data first
      await prisma.result.deleteMany({ where: { studentId } });
      await prisma.feePayment.deleteMany({ where: { feeRecord: { studentId } } });
      await prisma.feeRecord.deleteMany({ where: { studentId } });
      await prisma.examCard.deleteMany({ where: { studentId } });

      // Delete student
      await prisma.student.delete({
        where: { id: studentId }
      });

      // Delete associated user
      await prisma.user.delete({
        where: { id: student.userId }
      });
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== STUDENT SELF-SERVICE ENDPOINTS ==========

// Get my profile (for logged-in student)
router.get('/my-profile', authenticate, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
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

// Update my profile (limited fields - for logged-in student)
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
      disability
    } = req.body;

    // Find student profile
    const existingStudent = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Update only allowed fields
    const updatedStudent = await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        ...(address !== undefined && { address }),
        ...(parentGuardianPhone !== undefined && { parentGuardianPhone }),
        ...(parentEmail !== undefined && { parentEmail }),
        ...(disability !== undefined && { disability })
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
router.post('/my-photo', authenticate, async (req, res) => {
  try {
    // Ensure user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Check if files were uploaded
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    const photo = req.files.photo;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(photo.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG and PNG are allowed.' });
    }

    // Validate file size (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads/students');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(photo.name);
    const filename = `student-${student.id}-${Date.now()}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);

    // Delete old photo if exists
    if (student.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '..', student.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Save new photo
    await photo.mv(filepath);

    // Update database
    const photoUrl = `/uploads/students/${filename}`;
    await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl }
    });

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl
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

module.exports = router;
