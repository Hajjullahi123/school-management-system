const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

// Get class-wise performance
router.get('/class-performance', authenticate, async (req, res) => {
  try {
    const results = await prisma.result.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: { include: { classModel: true } },
        exam: true
      }
    });

    // Group by class and calculate averages
    const classPerformance = {};
    results.forEach(result => {
      const className = result.student.classModel ? `${result.student.classModel.name} ${result.student.classModel.arm}` : 'N/A';
      if (!classPerformance[className]) {
        classPerformance[className] = { total: 0, count: 0 };
      }
      classPerformance[className].total += (result.marks || result.totalScore || 0);
      classPerformance[className].count += 1;
    });

    const data = Object.keys(classPerformance).map(className => ({
      class: className,
      average: (classPerformance[className].total / classPerformance[className].count).toFixed(2)
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subject-wise performance
router.get('/subject-performance', authenticate, async (req, res) => {
  try {
    const results = await prisma.result.findMany({
      where: { schoolId: req.schoolId },
      include: {
        subject: true
      }
    });

    // Group by subject and calculate averages
    const subjectPerformance = {};
    results.forEach(result => {
      const subjectName = result.subject?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { total: 0, count: 0 };
      }
      subjectPerformance[subjectName].total += (result.marks || result.totalScore || 0);
      subjectPerformance[subjectName].count += 1;
    });

    const data = Object.keys(subjectPerformance).map(subjectName => ({
      subject: subjectName,
      average: (subjectPerformance[subjectName].total / subjectPerformance[subjectName].count).toFixed(2)
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get grade distribution
router.get('/grade-distribution', authenticate, async (req, res) => {
  try {
    const calculateGrade = (marks) => {
      if (marks >= 90) return 'A+';
      if (marks >= 80) return 'A';
      if (marks >= 70) return 'B';
      if (marks >= 60) return 'C';
      if (marks >= 50) return 'D';
      return 'F';
    };

    const results = await prisma.result.findMany({
      where: { schoolId: req.schoolId }
    });

    const gradeDistribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    results.forEach(result => {
      const marks = result.marks || result.totalScore || 0;
      const grade = result.grade || calculateGrade(marks);
      if (gradeDistribution[grade] !== undefined) {
        gradeDistribution[grade] += 1;
      }
    });

    res.json(gradeDistribution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top performers
router.get('/top-performers', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get all results grouped by student
    const results = await prisma.result.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: true
          }
        }
      }
    });

    // Calculate average for each student
    const studentAverages = {};
    results.forEach(result => {
      const studentId = result.studentId;
      if (!studentAverages[studentId]) {
        studentAverages[studentId] = {
          student: result.student,
          total: 0,
          count: 0
        };
      }
      studentAverages[studentId].total += result.marks;
      studentAverages[studentId].count += 1;
    });

    // Calculate averages and sort
    const topPerformers = Object.values(studentAverages)
      .map(data => ({
        name: `${data.student.user.firstName} ${data.student.user.lastName}`,
        admissionNumber: data.student.admissionNumber,
        class: data.student.classModel ? `${data.student.classModel.name} ${data.student.classModel.arm}` : 'N/A',
        average: (data.total / data.count).toFixed(2)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, limit);

    res.json(topPerformers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get students needing attention (below 50%)
router.get('/students-at-risk', authenticate, async (req, res) => {
  try {
    const results = await prisma.result.findMany({
      where: { schoolId: req.schoolId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: true
          }
        }
      }
    });

    // Calculate average for each student
    const studentAverages = {};
    results.forEach(result => {
      const studentId = result.studentId;
      if (!studentAverages[studentId]) {
        studentAverages[studentId] = {
          student: result.student,
          total: 0,
          count: 0
        };
      }
      studentAverages[studentId].total += result.marks;
      studentAverages[studentId].count += 1;
    });

    // Filter students with average below 50%
    const atRiskStudents = Object.values(studentAverages)
      .map(data => ({
        name: `${data.student.user.firstName} ${data.student.user.lastName}`,
        admissionNumber: data.student.admissionNumber,
        class: data.student.classModel ? `${data.student.classModel.name} ${data.student.classModel.arm}` : 'N/A',
        average: (data.total / data.count).toFixed(2)
      }))
      .filter(student => parseFloat(student.average) < 50)
      .sort((a, b) => a.average - b.average);

    res.json(atRiskStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
