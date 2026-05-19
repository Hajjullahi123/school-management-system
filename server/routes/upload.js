const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { uploadFile } = require('../services/storageService');

// ===========================================================
// Use MEMORY storage so we can convert to Base64 for DB storage
// This ensures images survive Render's ephemeral filesystem
// ===========================================================
const memoryStorage = multer.memoryStorage();

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
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
    fileSize: 5 * 1024 * 1024 // 5MB limit to align with frontend validation
  },
  fileFilter: imageFileFilter
});

// Helper: convert multer file buffer to a data URI string
function fileToBase64(file) {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
}

// ============ STUDENT PHOTO UPLOAD ============

// Upload student photo (Admin/Principal/Staff)
router.post('/:studentId/photo', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin', 'teacher']), upload.single('photo'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const schoolId = parseInt(req.schoolId);

    if (isNaN(schoolId)) {
      console.error('[Upload] Missing or invalid schoolId in request');
      return res.status(401).json({ error: 'Session expired or school ID missing. Please log in again.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if student exists and belongs to the school
    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: schoolId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Upload to cloud storage (or fallback to base64 if not configured)
    const photoUrl = await uploadFile(req.file, 'students');

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
      photoUrl: photoUrl
    });

    // Log the upload
    logAction({
      schoolId: schoolId,
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      resource: 'STUDENT',
      details: {
        studentId: studentId,
        method: 'cloud_storage_optimized',
        role: req.user.role
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('[Upload] Fatal error uploading student photo:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Delete student photo
router.delete('/:studentId/photo', authenticate, authorize(['admin', 'principal', 'accountant', 'examination_officer', 'attendance_admin', 'teacher']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const schoolId = parseInt(req.schoolId);

    if (isNaN(schoolId)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: schoolId
      }
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
      schoolId: parseInt(req.schoolId),
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

// Upload teacher photo (Admin/Principal)
router.post('/teacher/:teacherId/photo', authenticate, authorize(['admin', 'principal']), upload.single('photo'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if teacher exists and belongs to the school
    const teacher = await prisma.teacher.findFirst({
      where: { 
        id: teacherId,
        schoolId: parseInt(req.schoolId)
      }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Upload to cloud storage
    const photoUrl = await uploadFile(req.file, 'teachers');

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
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'UPLOAD_PHOTO',
      resource: 'TEACHER',
      details: {
        teacherId: teacherId,
        method: 'cloud_storage_optimized'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error uploading teacher photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete teacher photo
router.delete('/teacher/:teacherId/photo', authenticate, authorize(['admin', 'principal']), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    const teacher = await prisma.teacher.findFirst({
      where: { 
        id: teacherId,
        schoolId: parseInt(req.schoolId)
      }
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
      schoolId: parseInt(req.schoolId),
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

    const fileData = await uploadFile(req.file, 'documents');

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

    const fileData = await uploadFile(req.file, 'documents');

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

// Upload certificate photo (Admin/Principal)
router.post('/certificate/:certificateId/photo', authenticate, authorize(['admin', 'principal']), upload.single('photo'), async (req, res) => {
  try {
    const certificateId = parseInt(req.params.certificateId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if certificate exists and belongs to the school
    const certificate = await prisma.certificate.findFirst({
      where: { 
        id: certificateId,
        schoolId: parseInt(req.schoolId)
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Upload to cloud storage
    const passportUrl = await uploadFile(req.file, 'certificates');

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
      // Avoid sending the full 'certificate' object here. 
      // It already contains the massive 'passportUrl' string, so sending both
      // doubles the response size and memory load. 
      certificateId: updatedCertificate.id 
    });

    // Log the upload
    logAction({
      schoolId: parseInt(req.schoolId),
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
