const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

// Grade calculation utility
const calculateGrade = (marks) => {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  return 'F';
};

// Get report card for a student and exam
router.get('/:studentId/:examId', authenticate, async (req, res) => {
  try {
    const { studentId, examId } = req.params;

    // Fetch student details
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: { select: { name: true, arm: true } }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch exam details
    const exam = await prisma.exam.findFirst({
      where: {
        id: parseInt(examId),
        schoolId: req.schoolId
      }
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Fetch all results for this student and exam
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        examId: parseInt(examId),
        schoolId: req.schoolId
      },
      include: {
        subject: true
      },
      orderBy: {
        subject: {
          name: 'asc'
        }
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this student and exam' });
    }

    // Calculate grades and totals
    const subjectResults = results.map(result => ({
      subject: result.subject.name,
      subjectCode: result.subject.code,
      marks: result.marks,
      grade: calculateGrade(result.marks)
    }));

    const totalMarks = results.reduce((sum, result) => sum + result.marks, 0);
    const maxMarks = results.length * 100; // Assuming each subject is out of 100
    const percentage = (totalMarks / maxMarks) * 100;
    const overallGrade = calculateGrade(percentage);

    // Format response
    const reportCard = {
      student: {
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: `${student.classModel.name} ${student.classModel.arm || ''}`.trim()
      },
      exam: {
        name: exam.name,
        date: exam.date
      },
      results: subjectResults,
      summary: {
        totalMarks,
        maxMarks,
        percentage: percentage.toFixed(2),
        overallGrade
      }
    };

    res.json(reportCard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
