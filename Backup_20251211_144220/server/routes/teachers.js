const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/teacher-photos/');
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

// Update teacher profile
router.put('/profile', authenticate, authorize(['teacher']), upload.single('photo'), async (req, res) => {
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
      where: { id: userId },
      data: userUpdateData
    });

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

    const updatedTeacher = await prisma.teacher.update({
      where: { userId: userId },
      data: teacherUpdateData
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      teacher: updatedTeacher
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
