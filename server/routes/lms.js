const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Uploads
const lmsUploadsDir = path.join(__dirname, '../uploads/lms');
if (!fs.existsSync(lmsUploadsDir)) {
  fs.mkdirSync(lmsUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, lmsUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lms-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// ============ HOMEWORK ============

// Get Homework for a specific class
router.get('/homework/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const homeworks = await prisma.homework.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // If student, check if they've submitted
    if (req.user.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student) {
        const homeworksWithStatus = await Promise.all(homeworks.map(async (hw) => {
          const submission = await prisma.homeworkSubmission.findUnique({
            where: { homeworkId_studentId: { homeworkId: hw.id, studentId: student.id } }
          });
          return { ...hw, submitted: !!submission, submission };
        }));
        return res.json(homeworksWithStatus);
      }
    }

    res.json(homeworks);
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Create Homework (Teacher)
router.post('/homework', authenticate, authorize(['teacher', 'admin']), upload.single('file'), async (req, res) => {
  try {
    const { classId, subjectId, title, description, dueDate, externalUrl } = req.body;

    let fileUrl = externalUrl || null;
    let fileName = null;

    if (req.file) {
      fileUrl = `/uploads/lms/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    // TEACHER CHECK: Ensure teacher is assigned to this class and subject
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: req.user.id,
          classSubject: {
            classId: parseInt(classId),
            subjectId: parseInt(subjectId)
          }
        }
      });

      if (!assignment) {
        return res.status(403).json({ error: 'Unauthorized: You are not assigned to teach this subject in this class.' });
      }
    }

    const homework = await prisma.homework.create({
      data: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        title,
        description,
        fileUrl,
        fileName,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(homework);
    logAction({
      schoolId: req.schoolId, userId: req.user.id, action: 'CREATE', resource: 'HOMEWORK',
      details: { homeworkId: homework.id, title }, ipAddress: req.ip
    });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Submit Homework (Student)
router.post('/homework/:id/submit', authenticate, authorize(['student']), upload.single('file'), async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });

    if (!student) return res.status(404).json({ error: 'Student record not found' });
    if (!req.file) return res.status(400).json({ error: 'Please upload a file' });

    const submission = await prisma.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId, studentId: student.id } },
      update: {
        fileUrl: `/uploads/lms/${req.file.filename}`,
        fileName: req.file.originalname,
        submittedAt: new Date()
      },
      create: {
        schoolId: req.schoolId,
        homeworkId,
        studentId: student.id,
        fileUrl: `/uploads/lms/${req.file.filename}`,
        fileName: req.file.originalname
      }
    });

    res.json(submission);
  } catch (error) {
    console.error('Submit homework error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Get Submissions for a Homework (Teacher)
router.get('/homework/:id/submissions', authenticate, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id);
    const submissions = await prisma.homeworkSubmission.findMany({
      where: { homeworkId, schoolId: req.schoolId },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      }
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Grade Submission (Teacher)
router.put('/submissions/:id/grade', authenticate, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, feedback } = req.body;

    const submission = await prisma.homeworkSubmission.update({
      where: { id: parseInt(id) },
      data: { grade, feedback, gradedBy: req.user.id }
    });

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to grade' });
  }
});

// Delete Homework
router.delete('/homework/:id', authenticate, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const hw = await prisma.homework.findUnique({ where: { id: parseInt(id) } });

    if (!hw) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'teacher' && hw.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete file if exists
    if (hw.fileUrl) {
      const filePath = path.join(__dirname, '..', hw.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.homework.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ============ LEARNING RESOURCES ============

// Get Resources
router.get('/resources/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const resources = await prisma.learningResource.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Create Resource (Teacher)
router.post('/resources', authenticate, authorize(['teacher', 'admin']), upload.single('file'), async (req, res) => {
  try {
    const { classId, subjectId, title, description, type, externalUrl } = req.body;

    let fileUrl = externalUrl || null;
    let fileName = null;

    if (req.file) {
      fileUrl = `/uploads/lms/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    // TEACHER CHECK: Ensure teacher is assigned to this class and subject
    if (req.user.role === 'teacher') {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: req.user.id,
          classSubject: {
            classId: parseInt(classId),
            subjectId: parseInt(subjectId)
          }
        }
      });

      if (!assignment) {
        return res.status(403).json({ error: 'Unauthorized: You are not assigned to teach this subject in this class.' });
      }
    }

    const resource = await prisma.learningResource.create({
      data: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        teacherId: req.user.id,
        title,
        description,
        fileUrl,
        fileName,
        type: type || 'note'
      }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Update Resource
router.put('/resources/:id', authenticate, authorize(['teacher', 'admin']), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { classId, subjectId, title, description, type, externalUrl } = req.body;

    const existing = await prisma.learningResource.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Resource not found' });

    // Authorization check
    if (req.user.role === 'teacher' && existing.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this resource' });
    }

    let fileUrl = externalUrl || existing.fileUrl;
    let fileName = existing.fileName;

    if (req.file) {
      // Delete old file if it exists and a new one is uploaded
      if (existing.fileUrl && existing.fileUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', existing.fileUrl);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      fileUrl = `/uploads/lms/${req.file.filename}`;
      fileName = req.file.originalname;
    } else if (externalUrl) {
      // If external URL is provided, and there was a file before, delete it
      if (existing.fileUrl && existing.fileUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', existing.fileUrl);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      fileName = null;
    }

    const updated = await prisma.learningResource.update({
      where: { id: parseInt(id) },
      data: {
        classId: classId ? parseInt(classId) : existing.classId,
        subjectId: subjectId ? parseInt(subjectId) : existing.subjectId,
        title: title || existing.title,
        description: description || existing.description,
        type: type || existing.type,
        fileUrl,
        fileName
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete Resource
router.delete('/resources/:id', authenticate, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await prisma.learningResource.findUnique({ where: { id: parseInt(id) } });

    if (!resource) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'teacher' && resource.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (resource.fileUrl && resource.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', resource.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.learningResource.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
