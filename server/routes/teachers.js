const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const multer = require('multer');
const path = require('path');

const teachersUploadsDir = path.join(__dirname, '../uploads/teacher-photos');
if (!require('fs').existsSync(teachersUploadsDir)) {
  require('fs').mkdirSync(teachersUploadsDir, { recursive: true });
}

// Configure multer for photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, teachersUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'));
    }
  }
});

// Get all teachers (Admin Only)
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: req.schoolId },
      include: { user: true }
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Update teacher profile
router.put('/profile', authenticate, authorize(['teacher', 'examination_officer', 'admin', 'principal']), upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { specialization, staffId, email, firstName, lastName } = req.body;

    // Update user basic info
    const userUpdateData = {
      email: email || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined
    };

    // Remove undefined values
    Object.keys(userUpdateData).forEach(key =>
      userUpdateData[key] === undefined && delete userUpdateData[key]
    );

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
        schoolId: req.schoolId
      },
      data: userUpdateData
    });

    let updatedTeacher = null;
    if (req.user.role === 'teacher' || req.user.teacher) {
      // Update teacher specific info
      const teacherUpdateData = {
        specialization: specialization || undefined,
        staffId: staffId || undefined
      };

      // Add photo path if uploaded
      if (req.file) {
        teacherUpdateData.photoUrl = `/uploads/teacher-photos/${req.file.filename}`;
      }

      // Remove undefined values
      Object.keys(teacherUpdateData).forEach(key =>
        teacherUpdateData[key] === undefined && delete teacherUpdateData[key]
      );

      updatedTeacher = await prisma.teacher.update({
        where: {
          userId: userId,
          schoolId: req.schoolId
        },
        data: teacherUpdateData
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      teacher: updatedTeacher
    });

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TEACHER_PROFILE',
      details: {
        teacherId: updatedTeacher ? updatedTeacher.id : 'N/A',
        updates: [...Object.keys(req.body), ...(req.file ? ['photo'] : [])]
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// NEW: Simple Base64 Signature Upload
router.post('/signature-base64', authenticate, authorize(['teacher', 'examination_officer', 'admin', 'principal']), async (req, res) => {
  console.log('===Base64 teacher signature upload received===');

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Update database with base64 data to the User model
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        signatureUrl: imageData
      }
    });

    res.json({ success: true, signatureUrl: imageData });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'TEACHER_SIGNATURE',
      details: {
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading teacher signature:', error);
    res.status(500).json({ error: 'Failed to save signature: ' + error.message });
  }
});

module.exports = router;
