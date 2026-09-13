const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/students');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: studentId_timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload student photo
router.post('/:studentId/photo', authenticate, authorize(['admin']), upload.single('photo'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      // Delete uploaded file if student doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete old photo if exists
    if (student.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '..', student.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update student with new photo URL
    const photoUrl = `/uploads/students/${req.file.filename}`;
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl },
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
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      student: updatedStudent
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete student photo
router.delete('/:studentId/photo', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.photoUrl) {
      return res.status(400).json({ error: 'Student has no photo' });
    }

    // Delete photo file
    const photoPath = path.join(__dirname, '..', student.photoUrl);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    // Update student record
    await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl: null }
    });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ TEACHER PHOTO UPLOAD ============

// Create teachers uploads directory
const teachersUploadsDir = path.join(__dirname, '../uploads/teachers');
if (!fs.existsSync(teachersUploadsDir)) {
  fs.mkdirSync(teachersUploadsDir, { recursive: true });
}

// Configure multer for teacher photos
const teacherStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, teachersUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const teacherUpload = multer({
  storage: teacherStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload teacher photo
router.post('/teacher/:teacherId/photo', authenticate, authorize(['admin']), teacherUpload.single('photo'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      // Delete uploaded file if teacher doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Delete old photo if exists
    if (teacher.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '..', teacher.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update teacher with new photo URL
    const photoUrl = `/uploads/teachers/${req.file.filename}`;
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      teacher: updatedTeacher
    });
  } catch (error) {
    console.error('Error uploading teacher photo:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete teacher photo
router.delete('/teacher/:teacherId/photo', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (!teacher.photoUrl) {
      return res.status(400).json({ error: 'Teacher has no photo' });
    }

    // Delete photo file
    const photoPath = path.join(__dirname, '..', teacher.photoUrl);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    // Update teacher record
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl: null }
    });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher photo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
