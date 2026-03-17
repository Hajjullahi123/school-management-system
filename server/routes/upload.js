const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// ===========================================================
// Use MEMORY storage so we can convert to Base64 for DB storage
// This ensures images survive Render's ephemeral filesystem
// ===========================================================
const memoryStorage = multer.memoryStorage();

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
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
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Helper: convert multer file buffer to a data URI string
function fileToBase64(file) {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
}

// ============ STUDENT PHOTO UPLOAD ============

// Upload student photo (Admin)
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
      return res.status(404).json({ error: 'Student not found' });
    }

    // Convert to base64 data URI and store in DB
    const photoUrl = fileToBase64(req.file);

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classModel: true
      }
    });

    // Also update User model for centralized access
    if (updatedStudent.user?.id) {
      await prisma.user.update({
        where: { id: updatedStudent.user.id },
        data: { photoUrl }
      });
    }

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      student: updatedStudent
    });

    // Log the upload
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      resource: 'STUDENT',
      details: {
        studentId: studentId,
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
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

    // Update student record (just clear the field)
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl: null }
    });

    // Also clear from User model
    if (updatedStudent.userId) {
      await prisma.user.update({
        where: { id: updatedStudent.userId },
        data: { photoUrl: null }
      });
    }

    res.json({ message: 'Photo deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE_PHOTO',
      resource: 'STUDENT',
      details: { studentId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ TEACHER PHOTO UPLOAD ============

// Upload teacher photo (Admin)
router.post('/teacher/:teacherId/photo', authenticate, authorize(['admin']), upload.single('photo'), async (req, res) => {
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
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Convert to base64 data URI and store in DB
    const photoUrl = fileToBase64(req.file);

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Also update User model for centralized access
    if (updatedTeacher.user?.id) {
      await prisma.user.update({
        where: { id: updatedTeacher.user.id },
        data: { photoUrl }
      });
    }

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      teacher: updatedTeacher
    });

    // Log the upload
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      resource: 'TEACHER',
      details: {
        teacherId: teacherId,
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading teacher photo:', error);
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

    // Clear the field
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { photoUrl: null }
    });

    // Also clear from User model
    if (updatedTeacher.userId) {
      await prisma.user.update({
        where: { id: updatedTeacher.userId },
        data: { photoUrl: null }
      });
    }

    res.json({ message: 'Photo deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DELETE_PHOTO',
      resource: 'TEACHER',
      details: { teacherId },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting teacher photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DOCUMENT (PDF) UPLOAD ============
// Note: PDFs are stored as base64 in the database too.
// For large PDFs this may be slow, but it ensures persistence on ephemeral hosts.

// PDF file filter
const pdfFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'));
  }
};

const documentUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: pdfFileFilter
});

// Upload brochure
router.post('/brochure', authenticate, authorize(['admin']), documentUpload.single('brochure'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = fileToBase64(req.file);

    // Store in school settings
    await prisma.school.update({
      where: { id: req.schoolId },
      data: { brochureFileUrl: fileData }
    });

    res.json({
      message: 'Brochure uploaded successfully',
      fileUrl: fileData,
      filename: req.file.originalname
    });

    // Log the upload
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPLOAD_BROCHURE',
      resource: 'DOCUMENT',
      details: { filename: req.file.originalname, method: 'base64_database_storage' },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading brochure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload admission guide
router.post('/admission-guide', authenticate, authorize(['admin']), documentUpload.single('admissionGuide'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = fileToBase64(req.file);

    // Store in school settings
    await prisma.school.update({
      where: { id: req.schoolId },
      data: { admissionGuideFileUrl: fileData }
    });

    res.json({
      message: 'Admission guide uploaded successfully',
      fileUrl: fileData,
      filename: req.file.originalname
    });

    // Log the upload
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPLOAD_ADMISSION_GUIDE',
      resource: 'DOCUMENT',
      details: { filename: req.file.originalname, method: 'base64_database_storage' },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading admission guide:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ CERTIFICATE PHOTO UPLOAD ============

// Upload certificate photo
router.post('/certificate/:certificateId/photo', authenticate, authorize(['admin']), upload.single('photo'), async (req, res) => {
  try {
    const certificateId = parseInt(req.params.certificateId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if certificate exists
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Convert to base64 data URI and store in DB
    const passportUrl = fileToBase64(req.file);

    const updatedCertificate = await prisma.certificate.update({
      where: { id: certificateId },
      data: { passportUrl },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    res.json({
      message: 'Photo uploaded successfully',
      passportUrl: passportUrl,
      certificate: updatedCertificate
    });

    // Log the upload
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      resource: 'CERTIFICATE',
      details: {
        certificateId: certificateId,
        method: 'base64_database_storage'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading certificate photo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
