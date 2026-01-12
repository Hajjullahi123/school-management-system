const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/alumni');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'alumni-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to resolve schoolId from query or authenticated request
async function resolveSchoolId(req) {
  if (req.schoolId) return req.schoolId;

  const schoolParam = req.query.school;
  if (schoolParam) {
    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { id: isNaN(parseInt(schoolParam)) ? -1 : parseInt(schoolParam) },
          { slug: schoolParam }
        ]
      }
    });
    return school?.id || null;
  }
  return null;
}

// 1. Get Public Alumni Directory
router.get('/directory', optionalAuth, async (req, res) => {
  try {
    // Priority: 1. Token (if available), 2. Query param
    let schoolId = req.user?.schoolId;

    if (!schoolId) {
      schoolId = await resolveSchoolId(req);
    }

    if (!schoolId) {
      return res.status(400).json({ error: 'School identifier is required' });
    }

    const { year, search } = req.query;

    const where = {
      schoolId: schoolId,
      student: {
        status: 'alumni',
        schoolId: schoolId
      }
    };

    // If it's a public request, only show public profiles
    // If it's an admin of THIS school, show everyone
    if (!req.user || req.user.role !== 'admin' || req.user.schoolId !== schoolId) {
      where.isPublic = true;
    }

    if (year) {
      where.graduationYear = parseInt(year);
    }

    if (search) {
      where.OR = [
        { student: { user: { firstName: { contains: search } } } },
        { student: { user: { lastName: { contains: search } } } }
      ];
    }

    const alumni = await prisma.alumni.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, role: true, username: true }
            }
          }
        }
      },
      orderBy: { graduationYear: 'desc' }
    });

    res.json(alumni);
  } catch (error) {
    console.error('Alumni directory error:', error);
    res.status(500).json({ error: 'Failed to fetch alumni directory' });
  }
});

// 2. Get Success Stories
router.get('/stories', async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ error: 'School identifier is required' });
    }

    const stories = await prisma.alumniStory.findMany({
      where: {
        isPublished: true,
        schoolId: schoolId
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
});

// 3. Get Alumni Profile (Current Logged In User)
router.get('/profile/current', authenticate, async (req, res) => {
  try {
    const userWithStudent = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        schoolId: req.schoolId
      },
      include: {
        student: {
          where: { schoolId: req.schoolId }
        }
      }
    });

    if (!userWithStudent?.student) {
      return res.status(404).json({ error: 'Alumni profile not found' });
    }

    const alumni = await prisma.alumni.findUnique({
      where: {
        studentId: userWithStudent.student.id,
        schoolId: req.schoolId
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!alumni) return res.status(404).json({ error: 'Alumni profile not found' });

    res.json(alumni);
  } catch (error) {
    console.error('Fetch current profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 3.1 Get Alumni Profile (by ID - for Admin or Portal)
router.get('/profile/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Authorization check: only self or admin
    if (req.user.role !== 'admin' && req.user.studentId !== studentId) {
      const user = await prisma.user.findFirst({
        where: { id: req.user.id, schoolId: req.schoolId },
        include: { student: { where: { schoolId: req.schoolId } } }
      });
      if (user?.student?.id !== studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const alumni = await prisma.alumni.findUnique({
      where: {
        studentId,
        schoolId: req.schoolId
      },
      include: {
        student: {
          include: {
            user: true
          }
        }
      }
    });

    if (!alumni) return res.status(404).json({ error: 'Profile not found' });

    res.json(alumni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 4. Update Alumni Profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, schoolId: req.schoolId },
      include: { student: { where: { schoolId: req.schoolId } } }
    });

    if (!user?.student || user.student.status !== 'alumni') {
      return res.status(400).json({ error: 'Only alumni can update their profile' });
    }

    const {
      currentJob, currentCompany, university, courseOfStudy,
      bio, isPublic, linkedinUrl, twitterUrl, portfolioUrl,
      skills, achievements
    } = req.body;

    const updated = await prisma.alumni.update({
      where: {
        studentId: user.student.id,
        schoolId: req.schoolId
      },
      data: {
        currentJob, currentCompany, university, courseOfStudy,
        bio, isPublic, linkedinUrl, twitterUrl, portfolioUrl,
        skills, achievements
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Admin create story
router.post('/stories', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const story = await prisma.alumniStory.create({
      data: {
        ...req.body,
        schoolId: req.schoolId,
        isPublished: true
      }
    });
    res.status(201).json(story);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'ALUMNI_STORY',
      details: {
        storyId: story.id,
        title: story.title
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// 5. Create Alumni Record from Existing Student (Admin Only - Promotion)
router.post('/admin/create', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { studentId, graduationYear, alumniId } = req.body;

    const existing = await prisma.alumni.findUnique({
      where: {
        studentId: parseInt(studentId),
        schoolId: req.schoolId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This student is already an alumni' });
    }

    // Ensure student exists
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId: req.schoolId }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Update student status to 'alumni'
    await prisma.student.update({
      where: { id: parseInt(studentId), schoolId: req.schoolId },
      data: { status: 'alumni' }
    });

    // Create Alumni record
    const alumni = await prisma.alumni.create({
      data: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        graduationYear: parseInt(graduationYear),
        alumniId: alumniId || `AL/${graduationYear}/${student.admissionNumber}`
      }
    });

    res.status(201).json(alumni);

    // Log the creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'ALUMNI_RECORD',
      details: {
        alumniId: alumni.id,
        studentId: alumni.studentId,
        graduationYear: alumni.graduationYear
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create alumni error:', error);
    res.status(500).json({ error: 'Failed to create alumni record' });
  }
});

// 5B. Direct Alumni Registration (Admin Only - for alumni not previously in system)
router.post('/admin/register-direct', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      // Personal Information
      firstName, lastName, middleName, email,
      dateOfBirth, gender, stateOfOrigin, nationality, address,
      // Academic Information
      graduationYear, classGraduated,
      // Alumni-Specific Information
      currentJob, currentCompany, university, courseOfStudy,
      bio, linkedinUrl, twitterUrl, portfolioUrl, skills, achievements,
      // Parent/Guardian Info (optional for records)
      parentGuardianName, parentGuardianPhone, parentEmail,
      // Medical Info (optional for records)
      bloodGroup, genotype, disability
    } = req.body;

    // Validation
    if (!firstName || !lastName || !graduationYear) {
      return res.status(400).json({ error: 'First name, last name, and graduation year are required' });
    }

    const bcrypt = require('bcryptjs');

    // Generate unique admission number for the alumni
    const year = graduationYear.toString().slice(-2);
    const count = await prisma.student.count({
      where: { schoolId: req.schoolId }
    });
    const admissionNumber = `ALM${year}${String(count + 1).padStart(4, '0')}`;

    // Generate alumni ID
    const alumniId = `AL/${graduationYear}/${admissionNumber}`;

    // 1. Check if email already exists
    const targetEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@alumni.school`;
    const existingUser = await prisma.user.findFirst({
      where: {
        schoolId: req.schoolId,
        email: targetEmail
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: `Email Error: The email '${targetEmail}' is already associated with an existing ${existingUser.role} (${existingUser.firstName} ${existingUser.lastName}). Please use a different email or search for this student in the records.`
      });
    }

    // 2. Check if username/alumniId already exists
    const existingUsername = await prisma.user.findFirst({
      where: {
        schoolId: req.schoolId,
        username: alumniId
      }
    });

    if (existingUsername) {
      return res.status(400).json({ error: `Alumni ID conflict: ${alumniId} already exists.` });
    }

    // Start transaction to create user, student, and alumni records
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const defaultPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const user = await tx.user.create({
        data: {
          schoolId: req.schoolId,
          username: alumniId,
          passwordHash,
          email: targetEmail,
          role: 'alumni',
          firstName,
          lastName,
          isActive: true,
          mustChangePassword: true
        }
      });

      // 2. Create Student Record (with alumni status)
      const student = await tx.student.create({
        data: {
          schoolId: req.schoolId,
          userId: user.id,
          admissionNumber,
          status: 'alumni',
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          stateOfOrigin: stateOfOrigin || null,
          nationality: nationality || 'Nigerian',
          address: address || null,
          middleName: middleName || null,
          parentGuardianName: parentGuardianName || null,
          parentGuardianPhone: parentGuardianPhone || null,
          parentEmail: parentEmail || null,
          bloodGroup: bloodGroup || null,
          genotype: genotype || null,
          disability: disability || 'None',
          classId: null // Alumni don't have current class
        }
      });

      // 3. Create Alumni Record
      const alumni = await tx.alumni.create({
        data: {
          schoolId: req.schoolId,
          studentId: student.id,
          graduationYear: parseInt(graduationYear),
          alumniId,
          currentJob: currentJob || null,
          currentCompany: currentCompany || null,
          university: university || null,
          courseOfStudy: courseOfStudy || null,
          bio: bio || null,
          linkedinUrl: linkedinUrl || null,
          twitterUrl: twitterUrl || null,
          portfolioUrl: portfolioUrl || null,
          skills: skills || null,
          achievements: achievements || null,
          isPublic: true
        },
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true, username: true }
              }
            }
          }
        }
      });

      return {
        alumni,
        credentials: {
          username: alumniId,
          password: defaultPassword,
          email: targetEmail
        }
      };
    });

    res.status(201).json(result);

    // Log the creation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'ALUMNI_DIRECT_REGISTRATION',
      details: {
        alumniId: result.alumni.id,
        studentId: result.alumni.studentId,
        graduationYear: result.alumni.graduationYear,
        name: `${firstName} ${lastName}`
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Direct alumni registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to register alumni' });
  }
});

// 6. Generate/Reset Alumni Credentials (Admin Only)
router.post('/admin/generate-credentials', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { studentId } = req.body;
    const bcrypt = require('bcryptjs');

    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId: req.schoolId },
      include: {
        user: true,
        alumniProfile: { where: { schoolId: req.schoolId } }
      }
    });

    if (!student || !student.alumniProfile) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    const alumniId = student.alumniProfile.alumniId || `AL/${student.alumniProfile.graduationYear}/${student.admissionNumber}`;

    const rawPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.update({
      where: { id: student.userId, schoolId: req.schoolId },
      data: {
        username: alumniId,
        passwordHash,
        role: 'alumni'
      }
    });

    if (!student.alumniProfile.alumniId) {
      await prisma.alumni.update({
        where: { id: student.alumniProfile.id, schoolId: req.schoolId },
        data: { alumniId }
      });
    }

    res.json({
      message: 'Credentials generated successfully',
      username: alumniId,
      password: rawPassword
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_CREDENTIALS',
      resource: 'ALUMNI',
      details: {
        studentId: parseInt(studentId),
        username: alumniId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Credential generation error:', error);
    res.status(500).json({ error: 'Failed to generate credentials' });
  }
});

// 7. Record Donation
router.post('/donation', async (req, res) => {
  try {
    const { donorName, amount, message, isAnonymous, alumniId } = req.body;
    const schoolId = await resolveSchoolId(req) || parseInt(req.body.schoolId);

    if (!schoolId) {
      return res.status(400).json({ error: 'School identifier is required' });
    }

    if (!donorName || !amount) {
      return res.status(400).json({ error: 'Donor name and amount are required' });
    }

    let verifiedAlumniId = null;
    if (alumniId) {
      const alumni = await prisma.alumni.findUnique({
        where: { id: parseInt(alumniId), schoolId }
      });
      if (alumni) verifiedAlumniId = alumni.id;
    }

    const donation = await prisma.alumniDonation.create({
      data: {
        schoolId,
        donorName,
        amount: parseFloat(amount),
        message,
        isAnonymous: isAnonymous || false,
        alumniId: verifiedAlumniId
      }
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error('Donation error:', error);
    res.status(500).json({ error: 'Failed to record donation' });
  }
});

// 8. Get Donations (Public/Alumni)
router.get('/donations', async (req, res) => {
  try {
    const schoolId = await resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ error: 'School identifier is required' });
    }

    const donations = await prisma.alumniDonation.findMany({
      where: { schoolId },
      orderBy: { date: 'desc' },
      take: 20
    });

    const sanitized = donations.map(d => ({
      ...d,
      donorName: d.isAnonymous ? 'Anonymous' : d.donorName
    }));

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// 8.1 Get My Donations (Logged-in Alumni)
router.get('/my-donations', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.id, schoolId: req.schoolId },
      include: { student: { where: { schoolId: req.schoolId } } }
    });

    if (!user?.student) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    const alumni = await prisma.alumni.findUnique({
      where: { studentId: user.student.id, schoolId: req.schoolId }
    });

    if (!alumni) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    const donations = await prisma.alumniDonation.findMany({
      where: { alumniId: alumni.id, schoolId: req.schoolId },
      orderBy: { date: 'desc' }
    });

    res.json(donations);
  } catch (error) {
    console.error('Fetch my donations error:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// 9. Delete Donation (Admin Only)
router.delete('/donation/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.alumniDonation.delete({
      where: { id, schoolId: req.schoolId }
    });
    res.json({ message: 'Donation deleted successfully' });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE',
      resource: 'ALUMNI_DONATION',
      details: {
        donationId: id
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ error: 'Failed to delete donation' });
  }
});

// 10. Update Donation (Admin Only)
router.put('/donation/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { donorName, amount, message, isAnonymous } = req.body;

    const updated = await prisma.alumniDonation.update({
      where: { id, schoolId: req.schoolId },
      data: {
        donorName,
        amount: parseFloat(amount),
        message,
        isAnonymous
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json({ error: 'Failed to update donation' });
  }
});

// 11. Update Alumni Profile (Admin Only)
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      currentJob, currentCompany, university, courseOfStudy,
      bio, linkedinUrl, twitterUrl, portfolioUrl,
      skills, achievements, profilePicture
    } = req.body;

    const updated = await prisma.alumni.update({
      where: { id, schoolId: req.schoolId },
      data: {
        currentJob, currentCompany, university, courseOfStudy,
        bio, linkedinUrl, twitterUrl, portfolioUrl,
        skills, achievements, profilePicture
      }
    });

    res.json({ message: 'Alumni profile updated successfully', alumni: updated });
  } catch (error) {
    console.error('Update alumni error:', error);
    res.status(500).json({ error: 'Failed to update alumni profile' });
  }
});

// 12. Upload Alumni Photo (Admin Only)
router.post('/:id/photo', authenticate, authorize(['admin']), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const alumniId = parseInt(req.params.id);
    const photoUrl = `/uploads/alumni/${req.file.filename}`;

    const updated = await prisma.alumni.update({
      where: { id: alumniId, schoolId: req.schoolId },
      data: { profilePicture: photoUrl }
    });

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      alumni: updated
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

module.exports = router;
