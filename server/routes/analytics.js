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

// Get attendance trends (7-day history)
router.get('/attendance-trends', authenticate, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: req.schoolId,
        date: { gte: sevenDaysAgo }
      },
      select: {
        date: true,
        status: true
      }
    });

    // Group by date
    const trends = {};
    records.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!trends[dateStr]) {
        trends[dateStr] = { date: dateStr, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      }
      if (trends[dateStr][record.status] !== undefined) {
        trends[dateStr][record.status]++;
        trends[dateStr].total++;
      }
    });

    res.json(Object.values(trends).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance by class summary
router.get('/attendance-by-class', authenticate, async (req, res) => {
  try {
    const { termId, sessionId } = req.query;

    const where = { schoolId: req.schoolId };
    if (termId) where.termId = parseInt(termId);
    if (sessionId) where.academicSessionId = parseInt(sessionId);

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { class: { select: { name: true, arm: true } } }
    });

    const classSummary = {};
    records.forEach(r => {
      const className = r.class ? `${r.class.name} ${r.class.arm || ''}`.trim() : 'Unknown';
      if (!classSummary[className]) {
        classSummary[className] = { className, present: 0, absent: 0, total: 0 };
      }
      if (r.status === 'present') classSummary[className].present++;
      if (r.status === 'absent') classSummary[className].absent++;
      classSummary[className].total++;
    });

    res.json(Object.values(classSummary));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/submission-tracking
router.get('/submission-tracking', authenticate, async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { examMode: true, examModeType: true }
    });

    const currentSession = await prisma.academicSession.findFirst({ where: { schoolId: req.schoolId, isCurrent: true } });
    const currentTerm = await prisma.term.findFirst({ where: { schoolId: req.schoolId, isCurrent: true, academicSessionId: currentSession?.id } });

    if (!currentSession || !currentTerm) {
      return res.status(400).json({ error: 'Current session or term not set' });
    }

    // 1. Get all teacher assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: { schoolId: req.schoolId },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        classSubject: {
          include: {
            class: { select: { id: true, name: true, arm: true } },
            subject: { select: { id: true, name: true } }
          }
        }
      }
    });

    // 2. Get results for current term
    const results = await prisma.result.findMany({
      where: {
        schoolId: req.schoolId,
        academicSessionId: currentSession.id,
        termId: currentTerm.id
      },
      select: {
        id: true,
        studentId: true,
        classId: true,
        subjectId: true,
        assignment1Score: true,
        assignment2Score: true,
        test1Score: true,
        test2Score: true,
        examScore: true,
        isSubmitted: true
      }
    });

    // 3. Get student counts per class
    const studentCounts = await prisma.student.groupBy({
      by: ['classId'],
      where: { schoolId: req.schoolId },
      _count: { id: true }
    });

    const studentCountsMap = {};
    studentCounts.forEach(c => studentCountsMap[c.classId] = c._count.id);

    // 4. Track progress
    const trackingData = assignments.map(a => {
      const classId = a.classSubject.class.id;
      const subjectId = a.classSubject.subject.id;
      const totalStudents = studentCountsMap[classId] || 0;

      const classResults = results.filter(r => r.classId === classId && r.subjectId === subjectId);
      const gradedCount = classResults.length;

      // Detailed Tracking based on examModeType
      let isTargetFilled = false;
      const target = school.examModeType;

      if (target === 'assignment1') isTargetFilled = gradedCount > 0 && classResults.every(r => r.assignment1Score !== null);
      else if (target === 'assignment2') isTargetFilled = gradedCount > 0 && classResults.every(r => r.assignment2Score !== null);
      else if (target === 'test1') isTargetFilled = gradedCount > 0 && classResults.every(r => r.test1Score !== null);
      else if (target === 'test2') isTargetFilled = gradedCount > 0 && classResults.every(r => r.test2Score !== null);
      else if (target === 'examination') isTargetFilled = gradedCount > 0 && classResults.every(r => r.examScore !== null);
      else isTargetFilled = gradedCount > 0 && classResults.every(r => r.isSubmitted);

      // Partial check: if at least one student has the score
      const hasAnyScore = classResults.some(r => {
        if (target === 'assignment1') return r.assignment1Score !== null;
        if (target === 'assignment2') return r.assignment2Score !== null;
        if (target === 'test1') return r.test1Score !== null;
        if (target === 'test2') return r.test2Score !== null;
        if (target === 'examination') return r.examScore !== null;
        return r.isSubmitted;
      });

      let status = 'Not Started';
      if (isTargetFilled && gradedCount >= totalStudents && totalStudents > 0) status = 'Completed';
      else if (hasAnyScore) status = 'Partial';

      return {
        id: a.id,
        className: `${a.classSubject.class.name} ${a.classSubject.class.arm || ''}`.trim(),
        subjectName: a.classSubject.subject.name,
        teacherName: `${a.teacher.firstName} ${a.teacher.lastName}`,
        totalStudents,
        gradedCount,
        status,
        submissionDate: classResults.length > 0 ? classResults[0].submittedAt : null,
        isSubmitted: classResults.every(r => r.isSubmitted) && gradedCount >= totalStudents && totalStudents > 0
      };
    });

    res.json({
      tracking: trackingData,
      config: {
        examMode: school.examMode,
        examModeType: school.examModeType,
        term: currentTerm.name,
        session: currentSession.name
      }
    });
  } catch (error) {
    console.error('Submission tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
