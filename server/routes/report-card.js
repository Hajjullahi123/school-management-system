const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { getGrade, getRemark } = require('../utils/grading');

// Get terminal report card for a student and term
router.get('/:studentId/:termId', authenticate, async (req, res) => {
  try {
    const { studentId, termId } = req.params;
    const sId = parseInt(studentId);
    const tId = parseInt(termId);

    // 0. Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        gradingSystem: true,
        passThreshold: true,
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true
      }
    });
    const student = await prisma.student.findFirst({
      where: { id: sId, schoolId: req.schoolId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true
          }
        },
        classModel: {
          select: {
            name: true,
            arm: true,
            id: true
          }
        }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // 2. Fetch Term and Academic Session
    const term = await prisma.term.findFirst({
      where: { id: tId, schoolId: req.schoolId },
      include: { academicSession: true }
    });

    if (!term) return res.status(404).json({ error: 'Term not found' });

    // 3. Fetch Results (Detailed)
    const results = await prisma.result.findMany({
      where: {
        studentId: sId,
        termId: tId,
        schoolId: req.schoolId
      },
      include: {
        subject: true
      },
      orderBy: {
        subject: { name: 'asc' }
      }
    });

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: student.classId, schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || results.length || 1;

    // 4. Fetch Attendance Stats
    const totalDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: sId,
        termId: tId
      }
    });

    const presentDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: sId,
        termId: tId,
        status: { in: ['present', 'late'] }
      }
    });

    // 5. Fetch Remarks and Psychomotor (StudentReportCard)
    const extraDetails = await prisma.studentReportCard.findFirst({
      where: {
        studentId: sId,
        termId: tId,
        schoolId: req.schoolId
      }
    });

    // 6. Fetch Psychomotor Domains for reference
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // Map ratings
    const ratings = extraDetails?.psychomotorRatings ? JSON.parse(extraDetails.psychomotorRatings) : [];

    // Calculate Summary
    const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    const averageScore = totalScore / totalSubjectsCount;

    // Get class average for the student
    const classmates = await prisma.student.findMany({
      where: { classId: student.classId, schoolId: req.schoolId, status: 'active' },
      select: { id: true }
    });

    const classResults = await prisma.result.findMany({
      where: { termId: tId, classId: student.classId, schoolId: req.schoolId },
      select: { totalScore: true, studentId: true }
    });

    // Calculate student's overall position in class
    const studentTotalsForRank = {};
    classmates.forEach(c => {
      studentTotalsForRank[c.id] = 0;
    });

    classResults.forEach(r => {
      if (studentTotalsForRank[r.studentId] !== undefined) {
        studentTotalsForRank[r.studentId] += r.totalScore || 0;
      }
    });

    const sortedStudents = Object.entries(studentTotalsForRank)
      .sort(([, a], [, b]) => b - a);

    const position = sortedStudents.findIndex(([id]) => parseInt(id) === sId) + 1;
    const totalInClass = classmates.length;

    // --- NEW LOGIC FOR AGE, CLUB, AND TERM SEQUENCE ---
    const calculateAge = (dob) => {
      if (!dob) return '-';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Determine term sequence (1, 2, or 3)
    const allTerms = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const termIndex = allTerms.findIndex(t => t.id === tId);
    const termNumber = termIndex + 1;

    // Fetch previous terms' results if it's the 3rd term
    let previousTermsResults = [];
    if (termNumber === 3) {
      previousTermsResults = await prisma.result.findMany({
        where: {
          studentId: sId,
          academicSessionId: term.academicSessionId,
          termId: { in: allTerms.slice(0, 2).map(t => t.id) },
          schoolId: req.schoolId
        }
      });
    }

    // Format response
    const reportCard = {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.middleName || ''} ${student.user.lastName}`.replace(/\s+/g, ' ').trim(),
        admissionNumber: student.admissionNumber,
        class: `${student.classModel.name} ${student.classModel.arm || ''}`.trim(),
        gender: student.gender,
        photoUrl: student.photoUrl,
        dob: student.dateOfBirth,
        age: calculateAge(student.dateOfBirth),
        clubs: student.clubs || 'JETS CLUB'
      },
      academic: {
        session: term.academicSession.name,
        term: term.name,
        termNumber: termNumber,
        termStart: term.startDate,
        termEnd: term.endDate,
        nextTermBegins: term.endDate ? new Date(new Date(term.endDate).getTime() + 14 * 24 * 60 * 60 * 1000) : null,
        weights: {
          assignment1: schoolSettings.assignment1Weight,
          assignment2: schoolSettings.assignment2Weight,
          test1: schoolSettings.test1Weight,
          test2: schoolSettings.test2Weight,
          exam: schoolSettings.examWeight
        }
      },
      attendance: {
        present: presentDays,
        total: totalDays,
        percentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0
      },
      results: classSubjects.map(cs => {
        const r = results.find(res => res.subjectId === cs.subjectId);

        let t1Score = null;
        let t2Score = null;
        let cumulativeAvg = null;

        if (termNumber === 3) {
          const t1 = previousTermsResults.find(res => res.subjectId === cs.subjectId && res.termId === allTerms[0].id);
          const t2 = previousTermsResults.find(res => res.subjectId === cs.subjectId && res.termId === allTerms[1].id);
          t1Score = t1 ? t1.totalScore : 0;
          t2Score = t2 ? t2.totalScore : 0;
          cumulativeAvg = (t1Score + t2Score + (r ? r.totalScore : 0)) / 3;
        }

        const grade = r ? (r.grade || getGrade(r.totalScore, schoolSettings.gradingSystem)) : getGrade(0, schoolSettings.gradingSystem);
        const remark = r ? getRemark(grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem);

        return {
          subject: cs.subject.name,
          subjectCode: cs.subject.code,
          assignment1: r ? r.assignment1Score : 0,
          assignment2: r ? r.assignment2Score : 0,
          test1: r ? r.test1Score : 0,
          test2: r ? r.test2Score : 0,
          exam: r ? r.examScore : 0,
          total: r ? r.totalScore : 0,
          grade: grade,
          remark: remark,
          position: r ? r.positionInClass : '-',
          classAverage: r ? r.classAverage : 0,
          term1Score: t1Score,
          term2Score: t2Score,
          cumulativeAverage: cumulativeAvg
        };
      }),
      summary: {
        totalScore: totalScore.toFixed(2),
        average: averageScore.toFixed(2),
        overallGrade: getGrade(averageScore, schoolSettings.gradingSystem),
        position: position > 0 ? position : '-',
        totalInClass: totalInClass,
        status: averageScore >= (schoolSettings.passThreshold || 40) ? 'PASS' : 'FAIL'
      },
      extras: {
        formMasterRemark: extraDetails?.formMasterRemark || getRemark(getGrade(averageScore, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        principalRemark: extraDetails?.principalRemark || getRemark(getGrade(averageScore, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        psychomotorRatings: psychomotorDomains.map(d => {
          const rating = ratings.find(r => r.domainId === d.id);
          return {
            name: d.name,
            score: rating ? rating.score : null,
            maxScore: d.maxScore
          };
        })
      }
    };

    res.json(reportCard);
  } catch (error) {
    console.error('Report Card Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
