const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Parse CSV content
const parseCSV = (content) => {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  return data;
};

// Bulk upload results from CSV
router.post('/upload', authenticate, authorize(['admin', 'teacher', 'principal']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsedData = parseCSV(csvContent);

    const results = [];
    const errors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const lineNumber = i + 2; // +2 because line 1 is header and array is 0-indexed

      try {
        // Find student by roll number
        const student = await prisma.student.findFirst({
          where: {
            rollNo: row.rollNo,
            schoolId: req.schoolId
          }
        });

        if (!student) {
          errors.push({ line: lineNumber, error: `Student with roll number ${row.rollNo} not found` });
          continue;
        }

        // Find subject by code or name
        const subject = await prisma.subject.findFirst({
          where: {
            schoolId: req.schoolId,
            OR: [
              { code: row.subjectCode },
              { name: row.subjectCode }
            ]
          }
        });

        if (!subject) {
          errors.push({ line: lineNumber, error: `Subject ${row.subjectCode} not found` });
          continue;
        }

        // Find exam by name
        const exam = await prisma.exam.findFirst({
          where: {
            name: row.examName,
            schoolId: req.schoolId
          }
        });

        if (!exam) {
          errors.push({ line: lineNumber, error: `Exam ${row.examName} not found` });
          continue;
        }

        // Validate marks
        const marks = parseFloat(row.marks);
        if (isNaN(marks) || marks < 0 || marks > 100) {
          errors.push({ line: lineNumber, error: `Invalid marks: ${row.marks}` });
          continue;
        }

        // Upsert result
        const result = await prisma.result.upsert({
          where: {
            studentId_subjectId_examId: {
              schoolId: req.schoolId,
              studentId: student.id,
              subjectId: subject.id,
              examId: exam.id
            }
          },
          update: { marks },
          create: {
            schoolId: req.schoolId,
            studentId: student.id,
            subjectId: subject.id,
            examId: exam.id,
            marks
          }
        });

        results.push({ line: lineNumber, success: true, result });
      } catch (error) {
        errors.push({ line: lineNumber, error: error.message });
      }
    }

    res.json({
      success: true,
      totalRows: parsedData.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_UPLOAD',
      resource: 'RESULT_CSV',
      details: {
        totalRows: parsedData.length,
        successCount: results.length,
        errorCount: errors.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
