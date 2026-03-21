const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const {
  calculateStudentTermAverage,
  calculateStudentSessionAverage,
  getGrade,
  getRemark
} = require('../utils/grading');
const { getStudentFeeSummary } = require('../utils/feeCalculations');

// Get term report for a student
router.get('/term/:studentId/:termId', authenticate, async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        gradingSystem: true,
        passThreshold: true,
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true,
        principalSignatureUrl: true
      }
    });

    // Fetch student with all details
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        classModel: {
          include: {
            classTeacher: {
              select: {
                firstName: true,
                lastName: true,
                signatureUrl: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check permissions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      if (student.classModel) {
        const publication = await prisma.resultPublication.findUnique({
          where: {
            schoolId_classId_termId: {
              schoolId: req.schoolId,
              classId: student.classModel.id,
              termId: parseInt(termId)
            }
          }
        });

        if (!publication || !publication.isPublished) {
          return res.status(403).json({
            error: 'Result Not Published',
            message: 'The result for this class and term has not been published.'
          });
        }
      }
    } else if (req.user.role === 'teacher') {
      const isClassTeacher = student.classModel?.classTeacherId === req.user.id;
      if (!isClassTeacher && req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You can only view reports for students in your assigned class.'
        });
      }
    }

    // Fetch term details
    const term = await prisma.term.findFirst({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      },
      include: {
        academicSession: true
      }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // Fetch all results for this student in this term
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
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

    // Guard: student must have a class assigned
    if (!student.classId) {
      return res.status(400).json({ error: 'This student is not assigned to any class. Please assign the student to a class first.' });
    }

    // Fetch all subjects for the class to ensure all appear on report
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: student.classId, schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || results.length || 1;

    // Calculate term average based on all MUST-TAKE subjects in class
    const termAverage = await calculateStudentTermAverage(
      prisma,
      parseInt(studentId),
      parseInt(termId),
      req.schoolId,
      totalSubjectsCount
    );

    // Calculate term position (rank among classmates) using Competition Ranking (1,1,3)
    // Optimized: Use groupBy to sum scores instead of fetching all result objects
    const resultsSummary = await prisma.result.groupBy({
      by: ['studentId'],
      where: {
        classId: student.classId,
        termId: parseInt(termId),
        schoolId: req.schoolId,
        student: { status: 'active' }
      },
      _sum: {
        totalScore: true
      }
    });

    const sortedAverages = resultsSummary
      .map(entry => ({
        studentId: entry.studentId,
        average: (entry._sum.totalScore || 0) / totalSubjectsCount
      }))
      .sort((a, b) => b.average - a.average);

    // Competition Ranking Logic (1, 1, 3)
    let termPosition = 1;
    let prevAverage = -1;
    let rank = 0;
    for (let i = 0; i < sortedAverages.length; i++) {
      rank++;
      if (sortedAverages[i].average !== prevAverage) {
        termPosition = rank;
      }
      if (sortedAverages[i].studentId === parseInt(studentId)) {
        break;
      }
      prevAverage = sortedAverages[i].average;
    }

    const totalStudents = sortedAverages.length;

    // Fetch Attendance Stats
    // Fix: Total attendance days should be the total distinct days attendance was taken for the entire class,
    // not just the days this specific student was present/absent.
    const classAttendanceDays = await prisma.attendanceRecord.groupBy({
      by: ['date'],
      where: {
        schoolId: req.schoolId,
        classId: student.classId,
        termId: parseInt(termId)
      }
    });

    const totalAttendanceDays = classAttendanceDays.length;

    const presentAttendanceDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        status: { in: ['present', 'late'] }
      }
    });

    // Find next term
    const nextTerm = await prisma.term.findFirst({
      where: {
        schoolId: req.schoolId,
        startDate: {
          gt: term.startDate
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Fetch report card extras (remarks & psychomotor)
    const reportExtras = await prisma.studentReportCard.findFirst({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        schoolId: req.schoolId
      }
    });

    // Fetch psychomotor domains for better mapping
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // Fetch fee summary for the financial section of the report
    const feeSummary = await getStudentFeeSummary(
      req.schoolId,
      parseInt(studentId),
      term.academicSessionId,
      parseInt(termId)
    );

    let ratings = [];
    try {
      ratings = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
    } catch (e) {
      console.error('Error parsing psychomotor ratings:', e);
      ratings = [];
    }

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
    const termIndex = allTerms.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;

    // Fetch previous terms' results if it's the 3rd term
    let previousTermsResults = [];
    if (termNumber === 3) {
      previousTermsResults = await prisma.result.findMany({
        where: {
          studentId: parseInt(studentId),
          academicSessionId: term.academicSessionId,
          termId: { in: allTerms.slice(0, 2).map(t => t.id) },
          schoolId: req.schoolId
        }
      });
    }

    const reportData = {
      student: {
        id: student.id,
        name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        dateOfBirth: student.dateOfBirth,
        age: calculateAge(student.dateOfBirth),
        gender: student.gender,
        photoUrl: student.photoUrl,
        clubs: student.clubs || 'None Assigned',
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned',
        formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
      },
      term: {
        id: term.id,
        name: term.name,
        number: termNumber,
        session: term.academicSession.name,
        startDate: term.startDate,
        endDate: term.endDate,
        nextTermStartDate: nextTerm?.startDate || null,
        nextTermBegins: term.nextTermBeginsDate
          ? new Date(term.nextTermBeginsDate)
          : (term.endDate ? new Date(new Date(term.endDate).getTime() + 14 * 24 * 60 * 60 * 1000) : null),
        principalSignatureUrl: schoolSettings.principalSignatureUrl || null,
        weights: {
          assignment1: schoolSettings.assignment1Weight,
          assignment2: schoolSettings.assignment2Weight,
          test1: schoolSettings.test1Weight,
          test2: schoolSettings.test2Weight,
          exam: schoolSettings.examWeight
        }
      },
      attendance: {
        present: presentAttendanceDays,
        total: totalAttendanceDays,
        percentage: totalAttendanceDays > 0 ? ((presentAttendanceDays / totalAttendanceDays) * 100).toFixed(1) : 0
      },
      subjects: classSubjects.map(cs => {
        const result = results.find(r => r.subjectId === cs.subjectId);

        // Cumulative data for term 3
        let t1Score = null;
        let t2Score = null;
        let cumulativeAvg = null;

        if (termNumber === 3) {
          const t1 = previousTermsResults.find(r => r.subjectId === cs.subjectId && r.termId === allTerms[0].id);
          const t2 = previousTermsResults.find(r => r.subjectId === cs.subjectId && r.termId === allTerms[1].id);
          t1Score = t1 ? t1.totalScore : 0;
          t2Score = t2 ? t2.totalScore : 0;
          cumulativeAvg = (t1Score + t2Score + (result ? result.totalScore : 0)) / 3;
        }

        return {
          id: cs.subjectId,
          name: cs.subject?.name || 'Unknown Subject',
          assignment1: result ? result.assignment1Score : 0,
          assignment2: result ? result.assignment2Score : 0,
          test1: result ? result.test1Score : 0,
          test2: result ? result.test2Score : 0,
          exam: result ? result.examScore : 0,
          total: result ? result.totalScore : 0,
          grade: result ? result.grade : getGrade(0, schoolSettings.gradingSystem),
          position: result ? result.positionInClass : '-',
          classAverage: result ? result.classAverage : 0,
          remark: result ? getRemark(result.grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
          // Cumulative fields
          term1Score: t1Score,
          term2Score: t2Score,
          cumulativeAverage: cumulativeAvg
        };
      }),
      termAverage: termAverage,
      termPosition: termPosition,
      totalStudents: totalStudents,
      overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
      overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
      // Extras
      formMasterRemark: reportExtras?.formMasterRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
      principalRemark: reportExtras?.principalRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
      psychomotorRatings: psychomotorDomains.map(d => {
        const rating = ratings.find(r => r.domainId === d.id);
        return {
          name: d.name,
          score: rating ? rating.score : null,
          maxScore: d.maxScore || 5
        };
      }),
      feeSummary: feeSummary
    };

    res.json(reportData);

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_REPORT',
      resource: 'TERM_REPORT',
      details: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        classId: student.classId
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating term report:', error);
    res.status(500).json({ error: `Failed to generate term report: ${error.message}`, stack: error.stack });
  }
});

// Bulk term reports for an entire class
router.get('/bulk/:classId/:termId', authenticate, authorize(['admin', 'teacher', 'principal', 'superadmin', 'examination_officer']), async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const { startAdmission, endAdmission } = req.query;

    // Verify teacher permission
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId },
        select: { classTeacherId: true }
      });
      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        gradingSystem: true, passThreshold: true,
        assignment1Weight: true, assignment2Weight: true,
        test1Weight: true, test2Weight: true, examWeight: true,
        principalSignatureUrl: true
      }
    });

    // Fetch term details
    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId: req.schoolId },
      include: { academicSession: true }
    });
    if (!term) return res.status(404).json({ error: 'Term not found' });

    // Determine term number
    const allTermsInSession = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const termIndex = allTermsInSession.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;

    // Find next term
    const nextTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, startDate: { gt: term.startDate } },
      orderBy: { startDate: 'asc' }
    });

    // Fetch all active students in class
    let studentWhere = { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' };
    let students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: {
          include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });

    // Filter by admission number range if provided
    if (startAdmission || endAdmission) {
      const allAdmissions = students.map(s => s.admissionNumber).sort();
      let startIdx = 0;
      let endIdx = students.length - 1;
      if (startAdmission) {
        startIdx = students.findIndex(s => s.admissionNumber === startAdmission);
        if (startIdx === -1) startIdx = 0;
      }
      if (endAdmission) {
        endIdx = students.findIndex(s => s.admissionNumber === endAdmission);
        if (endIdx === -1) endIdx = students.length - 1;
      }
      students = students.slice(startIdx, endIdx + 1);
    }

    if (students.length === 0) return res.json({ reports: [] });

    // Fetch all class subjects once
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || 1;

    // Fetch ALL results for the class+term at once (efficient)
    const allResults = await prisma.result.findMany({
      where: { classId: parseInt(classId), termId: parseInt(termId), schoolId: req.schoolId },
      include: { subject: true }
    });

    // Calculate positions using all active students in class (Competition Ranking)
    const resultsSummary = await prisma.result.groupBy({
      by: ['studentId'],
      where: {
        classId: parseInt(classId), termId: parseInt(termId), schoolId: req.schoolId,
        student: { status: 'active' }
      },
      _sum: { totalScore: true }
    });

    const sortedAverages = resultsSummary
      .map(entry => ({ studentId: entry.studentId, average: (entry._sum.totalScore || 0) / totalSubjectsCount }))
      .sort((a, b) => b.average - a.average);

    // Build position map with competition ranking (1, 1, 3)
    const positionMap = {};
    let prevAvg = -1;
    let rank = 0;
    let currentPosition = 1;
    for (let i = 0; i < sortedAverages.length; i++) {
      rank++;
      if (sortedAverages[i].average !== prevAvg) {
        currentPosition = rank;
      }
      positionMap[sortedAverages[i].studentId] = currentPosition;
      prevAvg = sortedAverages[i].average;
    }
    const totalStudents = sortedAverages.length;

    // Fetch attendance data for all students in bulk
    const classAttendanceDays = await prisma.attendanceRecord.groupBy({
      by: ['date'],
      where: { schoolId: req.schoolId, classId: parseInt(classId), termId: parseInt(termId) }
    });
    const totalAttendanceDays = classAttendanceDays.length;

    const attendanceCounts = await prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        schoolId: req.schoolId, classId: parseInt(classId), termId: parseInt(termId),
        status: { in: ['present', 'late'] }
      },
      _count: { id: true }
    });
    const attendanceMap = {};
    attendanceCounts.forEach(a => { attendanceMap[a.studentId] = a._count.id; });

    // Fetch psychomotor domains once
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // Fetch all report extras for the class+term
    const allReportExtras = await prisma.studentReportCard.findMany({
      where: { termId: parseInt(termId), schoolId: req.schoolId }
    });
    const extrasMap = {};
    allReportExtras.forEach(e => { extrasMap[e.studentId] = e; });

    // Fetch previous terms results if term 3
    let allPreviousResults = [];
    if (termNumber === 3) {
      allPreviousResults = await prisma.result.findMany({
        where: {
          classId: parseInt(classId),
          academicSessionId: term.academicSessionId,
          termId: { in: allTermsInSession.slice(0, 2).map(t => t.id) },
          schoolId: req.schoolId
        }
      });
    }

    // Calculate age helper
    const calculateAge = (dob) => {
      if (!dob) return '-';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    // Generate reports for each student
    const reports = await Promise.all(students.map(async (student) => {
      const studentResults = allResults.filter(r => r.studentId === student.id);
      const reportExtras = extrasMap[student.id];
      const presentDays = attendanceMap[student.id] || 0;
      const termAverage = (studentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0)) / totalSubjectsCount;
      const termPosition = positionMap[student.id] || '-';

      let ratings = [];
      try {
        ratings = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
      } catch (e) { ratings = []; }

      // Fetch fee summary for the financial section of the report
      const feeSummary = await getStudentFeeSummary(
        req.schoolId,
        student.id,
        term.academicSessionId,
        parseInt(termId)
      );

      return {
        student: {
          id: student.id,
          name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          age: calculateAge(student.dateOfBirth),
          gender: student.gender,
          photoUrl: student.photoUrl,
          clubs: student.clubs || 'None Assigned',
          formMaster: student.classModel?.classTeacher
            ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
            : 'Not Assigned',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
        },
        term: {
          id: term.id,
          name: term.name,
          number: termNumber,
          session: term.academicSession.name,
          startDate: term.startDate,
          endDate: term.endDate,
          nextTermStartDate: nextTerm?.startDate || null,
          nextTermBegins: term.nextTermBeginsDate
            ? new Date(term.nextTermBeginsDate)
            : (term.endDate ? new Date(new Date(term.endDate).getTime() + 14 * 24 * 60 * 60 * 1000) : null),
          principalSignatureUrl: schoolSettings.principalSignatureUrl || null,
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
          total: totalAttendanceDays,
          percentage: totalAttendanceDays > 0 ? ((presentDays / totalAttendanceDays) * 100).toFixed(1) : 0
        },
        subjects: classSubjects.map(cs => {
          const result = studentResults.find(r => r.subjectId === cs.subjectId);
          let t1Score = null, t2Score = null, cumulativeAvg = null;
          if (termNumber === 3) {
            const prevStudentResults = allPreviousResults.filter(r => r.studentId === student.id);
            const t1 = prevStudentResults.find(r => r.subjectId === cs.subjectId && r.termId === allTermsInSession[0].id);
            const t2 = prevStudentResults.find(r => r.subjectId === cs.subjectId && r.termId === allTermsInSession[1].id);
            t1Score = t1 ? t1.totalScore : 0;
            t2Score = t2 ? t2.totalScore : 0;
            cumulativeAvg = (t1Score + t2Score + (result ? result.totalScore : 0)) / 3;
          }
          return {
            id: cs.subjectId,
            name: cs.subject?.name || 'Unknown Subject',
            assignment1: result ? result.assignment1Score : 0,
            assignment2: result ? result.assignment2Score : 0,
            test1: result ? result.test1Score : 0,
            test2: result ? result.test2Score : 0,
            exam: result ? result.examScore : 0,
            total: result ? result.totalScore : 0,
            grade: result ? result.grade : getGrade(0, schoolSettings.gradingSystem),
            position: result ? result.positionInClass : '-',
            classAverage: result ? result.classAverage : 0,
            remark: result ? getRemark(result.grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
            term1Score: t1Score, term2Score: t2Score, cumulativeAverage: cumulativeAvg
          };
        }),
        termAverage,
        termPosition,
        totalStudents,
        overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        formMasterRemark: reportExtras?.formMasterRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        principalRemark: reportExtras?.principalRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        psychomotorRatings: psychomotorDomains.map(d => {
          const rating = ratings.find(r => r.domainId === d.id);
          return { name: d.name, score: rating ? rating.score : null, maxScore: d.maxScore || 5 };
        }),
        feeSummary: feeSummary
      };
    }));

    res.json({ reports, totalStudents: reports.length });

    logAction({
      schoolId: req.schoolId, userId: req.user.id,
      action: 'GENERATE_BULK_REPORTS', resource: 'TERM_REPORT',
      details: { classId: parseInt(classId), termId: parseInt(termId), count: reports.length },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating bulk reports:', error);
    res.status(500).json({ error: `Failed to generate bulk reports: ${error.message}` });
  }
});

// Get cumulative report (all three terms)
router.get('/cumulative/:studentId/:sessionId', authenticate, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { gradingSystem: true, passThreshold: true, principalSignatureUrl: true }
    });

    // Fetch student
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        classModel: {
          include: {
            classTeacher: {
              select: {
                firstName: true,
                lastName: true,
                signatureUrl: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check permissions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      if (student.classModel) {
        // Cumulative report requires the LAST term (3rd term) in the session to be published.
        // Find the last term in this session
        const lastTermInSession = await prisma.term.findFirst({
          where: {
            academicSessionId: parseInt(sessionId),
            schoolId: req.schoolId
          },
          orderBy: { startDate: 'desc' }
        });

        if (!lastTermInSession) {
          return res.status(403).json({
            error: 'Result Not Published',
            message: 'No terms found for this session.'
          });
        }

        // Check if the last term's result is published for this class
        const lastTermPublication = await prisma.resultPublication.findUnique({
          where: {
            schoolId_classId_termId: {
              schoolId: req.schoolId,
              classId: student.classModel.id,
              termId: lastTermInSession.id
            }
          }
        });

        if (!lastTermPublication || !lastTermPublication.isPublished) {
          return res.status(403).json({
            error: 'Result Not Published',
            message: 'The cumulative report is only available after the third term results have been published.'
          });
        }
      }
    } else if (req.user.role === 'teacher') {
      if (!student.classModel || (student.classModel.classTeacherId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'superadmin')) {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You can only view reports for students in your assigned class.'
        });
      }
    }

    // Fetch session
    const session = await prisma.academicSession.findFirst({
      where: {
        id: parseInt(sessionId),
        schoolId: req.schoolId
      },
      include: {
        terms: {
          where: { schoolId: req.schoolId },
          orderBy: { startDate: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch all subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: student.classId, schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || 1;

    // Fetch results for all terms in this session
    const termsData = [];
    const subjectsMap = {};

    // Initialize subjects map with all subjects
    classSubjects.forEach(cs => {
      subjectsMap[cs.subjectId] = {
        id: cs.subjectId,
        name: cs.subject?.name || 'Unknown Subject',
        term1: 0,
        term2: 0,
        term3: 0,
        total: 0,
        count: 0
      };
    });

    for (let i = 0; i < session.terms.length; i++) {
      const term = session.terms[i];
      const termIdx = i + 1;

      const results = await prisma.result.findMany({
        where: {
          studentId: parseInt(studentId),
          termId: term.id,
          schoolId: req.schoolId
        },
        include: {
          subject: true
        }
      });

      const termAverage = await calculateStudentTermAverage(
        prisma,
        parseInt(studentId),
        term.id,
        req.schoolId,
        totalSubjectsCount
      );

      // Map results to subjects map for side-by-side view
      results.forEach(r => {
        if (subjectsMap[r.subjectId]) {
          const score = r.totalScore || 0;
          subjectsMap[r.subjectId][`term${termIdx}`] = score;
          subjectsMap[r.subjectId].total += score;
          subjectsMap[r.subjectId].count += 1;
        }
      });

      termsData.push({
        termName: term.name,
        average: termAverage,
        grade: getGrade(termAverage, schoolSettings.gradingSystem)
      });
    }

    // Convert subjects map to array and calculate cumulative averages
    const cumulativeSubjects = Object.values(subjectsMap).map(s => {
      const avg = s.count > 0 ? s.total / session.terms.length : 0; // Average over the session's terms
      return {
        ...s,
        average: avg,
        grade: getGrade(avg, schoolSettings.gradingSystem)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Calculate overall session average
    const sessionAverage = await calculateStudentSessionAverage(
      prisma,
      parseInt(studentId),
      parseInt(sessionId),
      req.schoolId,
      totalSubjectsCount * session.terms.length
    );

    // Determine promotion status
    const isPromoted = sessionAverage >= (schoolSettings.passThreshold || 40);
    const nextClass = isPromoted ? 'Promoted' : 'Repeat Class';

    res.json({
      student: {
        id: student.id,
        name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photoUrl: student.user?.photoUrl || student.photoUrl,
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned',
        formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
      },
      session: {
        name: session.name,
        principalSignatureUrl: schoolSettings.principalSignatureUrl || null
      },
      terms: termsData,
      subjects: cumulativeSubjects,
      overallAverage: sessionAverage,
      overallGrade: getGrade(sessionAverage, schoolSettings.gradingSystem),
      overallRemark: getRemark(getGrade(sessionAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
      isPromoted: isPromoted,
      nextClass: nextClass
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_CUMULATIVE_REPORT',
      resource: 'CUMULATIVE_REPORT',
      details: {
        studentId: parseInt(studentId),
        sessionId: parseInt(sessionId)
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating cumulative report:', error);
    res.status(500).json({ error: 'Failed to generate cumulative report' });
  }
});

// Get bulk cumulative reports for an entire class (for teachers/admins)
router.get('/bulk-cumulative/:classId/:sessionId', authenticate, authorize(['admin', 'teacher', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { classId, sessionId } = req.params;

    // Verify teacher permission
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId },
        select: { classTeacherId: true }
      });
      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        name: true, address: true, logoUrl: true, phone: true, email: true,
        motto: true, primaryColor: true, gradingSystem: true, passThreshold: true,
        principalSignatureUrl: true
      }
    });

    // Fetch session with ordered terms
    const session = await prisma.academicSession.findFirst({
      where: { id: parseInt(sessionId), schoolId: req.schoolId },
      include: { terms: { where: { schoolId: req.schoolId }, orderBy: { startDate: 'asc' } } }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Fetch all active students in class
    const students = await prisma.student.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' },
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: {
          include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } }
        }
      }
    });

    if (students.length === 0) return res.status(404).json({ error: 'No active students found in this class' });

    // Fetch all subjects for class once
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || 1;

    // Fetch all results for class and session at once
    const allResults = await prisma.result.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, academicSessionId: parseInt(sessionId) },
      include: { subject: true }
    });

    const reports = [];

    for (const student of students) {
      const subjectsMap = {};
      classSubjects.forEach(cs => {
        subjectsMap[cs.subjectId] = {
          id: cs.subjectId, name: cs.subject?.name || 'Unknown Subject',
          term1: 0, term2: 0, term3: 0, total: 0, count: 0
        };
      });

      const termsData = [];
      let sessionTotalScore = 0;

      for (let i = 0; i < session.terms.length; i++) {
        const term = session.terms[i];
        const termIdx = i + 1;
        const studentTermResults = allResults.filter(r => r.studentId === student.id && r.termId === term.id);

        let termTotal = 0;
        studentTermResults.forEach(r => {
          termTotal += r.totalScore || 0;
          if (subjectsMap[r.subjectId]) {
            subjectsMap[r.subjectId][`term${termIdx}`] = r.totalScore || 0;
            subjectsMap[r.subjectId].total += r.totalScore || 0;
            subjectsMap[r.subjectId].count += 1;
          }
        });

        const termAverage = termTotal / totalSubjectsCount;
        sessionTotalScore += termTotal;
        termsData.push({ termName: term.name, average: termAverage, grade: getGrade(termAverage, schoolSettings.gradingSystem) });
      }

      const sessionAverage = sessionTotalScore / (totalSubjectsCount * session.terms.length);
      const isPromoted = sessionAverage >= (schoolSettings.passThreshold || 40);

      const cumulativeSubjects = Object.values(subjectsMap).map(s => {
        const avg = s.count > 0 ? s.total / session.terms.length : 0;
        return { ...s, average: avg, grade: getGrade(avg, schoolSettings.gradingSystem) };
      }).sort((a, b) => a.name.localeCompare(b.name));

      reports.push({
        schoolSettings,
        student: {
          id: student.id,
          name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          photoUrl: student.user?.photoUrl || student.photoUrl,
          formMaster: student.classModel?.classTeacher
            ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
            : 'Not Assigned',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
        },
        session: { name: session.name, principalSignatureUrl: schoolSettings.principalSignatureUrl || null },
        terms: termsData,
        subjects: cumulativeSubjects,
        overallAverage: sessionAverage,
        overallGrade: getGrade(sessionAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(sessionAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        isPromoted,
        nextClass: isPromoted ? 'Promoted' : 'Repeat Class'
      });
    }

    res.json({ reports, schoolSettings, totalStudents: reports.length });

  } catch (error) {
    console.error('Error generating bulk cumulative reports:', error);
    res.status(500).json({ error: 'Failed to generate bulk cumulative reports' });
  }
});

// Get progressive report (after specific assessment)
router.get('/progressive/:studentId/:termId/:assessmentType', authenticate, async (req, res) => {
  try {
    const { studentId, termId, assessmentType } = req.params;

    // Fetch student
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        classModel: {
          include: {
            classTeacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Teacher permission check
    if (req.user.role === 'teacher') {
      if (!student.classModel || student.classModel.classTeacherId !== req.user.id) {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You can only view reports for students in your assigned class.'
        });
      }
    }

    // Fetch term
    const term = await prisma.term.findFirst({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      },
      include: {
        academicSession: true
      }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // Check if progressive results are published for students and parents
    if (req.user.role === 'student' || req.user.role === 'parent') {
      const publication = await prisma.resultPublication.findUnique({
        where: {
          schoolId_classId_termId: {
            schoolId: req.schoolId,
            classId: student.classId,
            termId: parseInt(termId)
          }
        }
      });

      if (!publication || !publication.isProgressivePublished) {
        return res.status(403).json({
          error: 'Result Not Published',
          message: 'The progressive report for this class and term has not been published.'
        });
      }
    }

    // Fetch results
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        schoolId: req.schoolId
      },
      include: {
        subject: true
      }
    });

    console.log(`[TermReport] Found ${results.length} results for student ${studentId} in term ${termId}`);

    // Filter based on assessment type
    const assessmentData = results.map(result => {
      let score = 0;
      let maxScore = 0;

      switch (assessmentType) {
        case 'assignment1':
          score = result.assignment1Score || 0;
          maxScore = 5;
          break;
        case 'assignment2':
          score = result.assignment2Score || 0;
          maxScore = 5;
          break;
        case 'test1':
          score = result.test1Score || 0;
          maxScore = 10;
          break;
        case 'test2':
          score = result.test2Score || 0;
          maxScore = 10;
          break;
        default:
          score = result.totalScore || 0;
          maxScore = 100;
      }

      return {
        subject: result.subject.name,
        score: score,
        maxScore: maxScore,
        percentage: (score / maxScore) * 100
      };
    });

    res.json({
      student: {
        name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        gender: student.gender,
        photoUrl: student.user?.photoUrl || student.photoUrl,
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned'
      },
      term: {
        name: term.name,
        session: term.academicSession.name
      },
      assessmentType: assessmentType,
      results: assessmentData
    });
  } catch (error) {
    console.error('Error generating progressive report:', error);
    res.status(500).json({ error: 'Failed to generate progressive report' });
  }
});

// Get enhanced progressive report (CA only, with positions)
router.get('/progressive-enhanced/:studentId/:termId', authenticate, async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        name: true,
        address: true,
        logoUrl: true,
        phone: true,
        email: true,
        motto: true,
        primaryColor: true,
        gradingSystem: true,
        passThreshold: true,
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        principalSignatureUrl: true
      }
    });

    // Fetch student
    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: {
          include: {
            classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } }
          }
        }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Teacher permission check
    if (req.user.role === 'teacher') {
      if (!student.classModel || student.classModel.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied', message: 'You can only view reports for students in your assigned class.' });
      }
    }

    // Fetch term
    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId: req.schoolId },
      include: { academicSession: true }
    });

    if (!term) return res.status(404).json({ error: 'Term not found' });

    // Check if progressive results are published for students and parents
    if (req.user.role === 'student' || req.user.role === 'parent') {
      const publication = await prisma.resultPublication.findUnique({
        where: {
          schoolId_classId_termId: {
            schoolId: req.schoolId,
            classId: student.classId,
            termId: parseInt(termId)
          }
        }
      });

      if (!publication || !publication.isProgressivePublished) {
        return res.status(403).json({
          error: 'Result Not Published',
          message: 'The progressive report for this class and term has not been published.'
        });
      }
    }

    // Determine term sequence
    const allTerms = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const termIndex = allTerms.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;

    // Fetch next term
    const nextTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, startDate: { gt: term.startDate } },
      orderBy: { startDate: 'asc' }
    });

    // Fetch all active students in class to calculate positions
    const allStudentsInClass = await prisma.student.findMany({
      where: { classId: student.classId, schoolId: req.schoolId, status: 'active' },
      select: { id: true }
    });
    const numStudentsInClass = allStudentsInClass.length;

    // Fetch all results for the class in this term
    const allClassResults = await prisma.result.findMany({
      where: {
        student: { classId: student.classId, status: 'active' },
        termId: parseInt(termId),
        schoolId: req.schoolId
      },
      select: {
        studentId: true,
        subjectId: true,
        assignment1Score: true,
        assignment2Score: true,
        test1Score: true,
        test2Score: true
      }
    });

    // Pre-calculate progressive totals for everyone
    const studentCATotals = {};
    const subjectScores = {};

    allClassResults.forEach(r => {
      const caTotal = (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0);

      // Total for overall ranking
      if (!studentCATotals[r.studentId]) studentCATotals[r.studentId] = 0;
      studentCATotals[r.studentId] += caTotal;

      // Group by subject for subject ranking
      if (!subjectScores[r.subjectId]) subjectScores[r.subjectId] = [];
      subjectScores[r.subjectId].push({ studentId: r.studentId, score: caTotal });
    });

    // Sort students by Overall CA Total for ranking
    const sortedOverall = Object.entries(studentCATotals)
      .map(([sId, score]) => ({ studentId: parseInt(sId), score }))
      .sort((a, b) => b.score - a.score);

    let currentStudentOverallPosition = 'N/A';
    const currentStudentOverallScore = studentCATotals[parseInt(studentId)] || 0;

    let rank = 0;
    let prevScore = -1;
    let actualPosition = 1;
    for (let i = 0; i < sortedOverall.length; i++) {
      rank++;
      if (sortedOverall[i].score !== prevScore) {
        actualPosition = rank;
      }
      if (sortedOverall[i].studentId === parseInt(studentId)) {
        currentStudentOverallPosition = actualPosition;
        break;
      }
      prevScore = sortedOverall[i].score;
    }

    // Sort each subject to rank students within subjects
    Object.keys(subjectScores).forEach(subId => {
      subjectScores[subId].sort((a, b) => b.score - a.score);
      let subRank = 0;
      let subPrevScore = -1;
      let subActualPosition = 1;

      subjectScores[subId].forEach(entry => {
        subRank++;
        if (entry.score !== subPrevScore) { subActualPosition = subRank; }
        entry.position = subActualPosition;
        subPrevScore = entry.score;
      });
    });

    // Fetch student's specific results
    const studentResults = await prisma.result.findMany({
      where: { studentId: parseInt(studentId), termId: parseInt(termId), schoolId: req.schoolId },
      include: { subject: true }
    });

    const totalSubjectsCount = allClassResults.reduce((acc, r) => {
      acc.add(r.subjectId);
      return acc;
    }, new Set()).size || 1;

    let caSumTotal = 0;
    const finalSubjectsData = studentResults.map(r => {
      const caTotal = (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0);
      caSumTotal += caTotal;

      const subScores = subjectScores[r.subjectId] || [];
      const myScoreEntry = subScores.find(s => s.studentId === parseInt(studentId));

      const highestInClass = subScores.length > 0 ? Math.max(...subScores.map(s => s.score)) : caTotal;
      const lowestInClass = subScores.length > 0 ? Math.min(...subScores.map(s => s.score)) : caTotal;
      const avgInClass = subScores.length > 0 ? subScores.reduce((sum, s) => sum + s.score, 0) / subScores.length : caTotal;

      return {
        id: r.id,
        subject: { name: r.subject.name },
        assignment1Score: r.assignment1Score,
        assignment2Score: r.assignment2Score,
        test1Score: r.test1Score,
        test2Score: r.test2Score,
        totalScore: caTotal,
        position: myScoreEntry ? myScoreEntry.position : 'N/A',
        highestInClass,
        lowestInClass,
        averageInClass: avgInClass,
        outOf: subScores.length,
        grade: getGrade(caTotal, schoolSettings.gradingSystem),
        remark: getRemark(getGrade(caTotal, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
      };
    });

    const caAverage = caSumTotal / totalSubjectsCount;

    // Attendance
    const totalAttendanceDays = await prisma.attendanceRecord.count({
      where: { schoolId: req.schoolId, studentId: parseInt(studentId), termId: parseInt(termId) }
    });
    const presentAttendanceDays = await prisma.attendanceRecord.count({
      where: { schoolId: req.schoolId, studentId: parseInt(studentId), termId: parseInt(termId), status: { in: ['present', 'late'] } }
    });

    // Helper to calculate age
    const calculateAge = (dob) => {
      if (!dob) return '-';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    res.json({
      schoolSettings,
      student: {
        id: student.id,
        name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        dateOfBirth: student.dateOfBirth,
        age: calculateAge(student.dateOfBirth),
        gender: student.gender,
        photoUrl: student.user?.photoUrl || student.photoUrl,
        club: student.club || '-',
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned',
        formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl
      },
      term: {
        name: term.name,
        session: term.academicSession.name,
        number: termNumber,
        principalSignatureUrl: schoolSettings.principalSignatureUrl,
        nextTermBegins: nextTerm ? nextTerm.startDate : null
      },
      attendance: {
        totalDays: totalAttendanceDays,
        daysPresent: presentAttendanceDays,
        daysAbsent: totalAttendanceDays - presentAttendanceDays
      },
      performance: {
        totalScore: currentStudentOverallScore,
        average: caAverage,
        position: currentStudentOverallPosition,
        outOf: numStudentsInClass,
        grade: getGrade(caAverage, schoolSettings.gradingSystem),
        remark: getRemark(getGrade(caAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
      },
      subjects: finalSubjectsData
    });
  } catch (error) {
    console.error('Error generating enhanced progressive report:', error);
    res.status(500).json({ error: 'Failed to generate progressive report' });
  }
});

// Get bulk enhanced progressive reports for an entire class
router.get('/bulk-progressive/:classId/:termId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, termId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        name: true,
        address: true,
        logoUrl: true,
        phone: true,
        email: true,
        motto: true,
        primaryColor: true,
        gradingSystem: true,
        passThreshold: true,
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        principalSignatureUrl: true
      }
    });

    // Verify teacher has permission for this class
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: { id: parseInt(classId), schoolId: req.schoolId },
        select: { classTeacherId: true }
      });
      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch term details
    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId: req.schoolId },
      include: { academicSession: true }
    });
    if (!term) return res.status(404).json({ error: 'Term not found' });

    // Determine term sequence
    const allTerms = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const termIndex = allTerms.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;

    // Find next term
    const nextTerm = await prisma.term.findFirst({
      where: { schoolId: req.schoolId, startDate: { gt: term.startDate } },
      orderBy: { startDate: 'asc' }
    });

    // Get active students inclass
    const allStudentsInClass = await prisma.student.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' },
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: { include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } } }
      }
    });
    const numStudentsInClass = allStudentsInClass.length;

    // Fetch all results for the class in this term
    const allClassResults = await prisma.result.findMany({
      where: { student: { classId: parseInt(classId) }, termId: parseInt(termId), schoolId: req.schoolId },
      include: { subject: true }
    });

    const totalSubjectsCount = allClassResults.reduce((acc, r) => { acc.add(r.subjectId); return acc; }, new Set()).size || 1;

    // Pre-calculate progressive totals for everyone
    const studentCATotals = {};
    const subjectScores = {};

    allClassResults.forEach(r => {
      const caTotal = (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0);
      if (!studentCATotals[r.studentId]) studentCATotals[r.studentId] = 0;
      studentCATotals[r.studentId] += caTotal;

      if (!subjectScores[r.subjectId]) subjectScores[r.subjectId] = [];
      subjectScores[r.subjectId].push({ studentId: r.studentId, score: caTotal });
    });

    // Sort students by Overall CA Total for ranking
    const sortedOverall = Object.entries(studentCATotals).map(([sId, score]) => ({ studentId: parseInt(sId), score })).sort((a, b) => b.score - a.score);
    const overallPositionsMap = {};
    let rank = 0; let prevScore = -1; let actualPosition = 1;
    for (let i = 0; i < sortedOverall.length; i++) {
      rank++;
      if (sortedOverall[i].score !== prevScore) actualPosition = rank;
      overallPositionsMap[sortedOverall[i].studentId] = actualPosition;
      prevScore = sortedOverall[i].score;
    }

    // Rank subjects
    Object.keys(subjectScores).forEach(subId => {
      subjectScores[subId].sort((a, b) => b.score - a.score);
      let subRank = 0; let subPrevScore = -1; let subActualPosition = 1;
      subjectScores[subId].forEach(entry => {
        subRank++;
        if (entry.score !== subPrevScore) subActualPosition = subRank;
        entry.position = subActualPosition;
        subPrevScore = entry.score;
      });
    });

    const reports = [];

    // Helper to calculate age
    const calculateAge = (dob) => {
      if (!dob) return '-';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    for (const student of allStudentsInClass) {
      // Attendance
      const totalAttendanceDays = await prisma.attendanceRecord.count({ where: { schoolId: req.schoolId, studentId: student.id, termId: parseInt(termId) } });
      const presentAttendanceDays = await prisma.attendanceRecord.count({ where: { schoolId: req.schoolId, studentId: student.id, termId: parseInt(termId), status: { in: ['present', 'late'] } } });

      const studentResults = allClassResults.filter(r => r.studentId === student.id);
      let caSumTotal = 0;

      const finalSubjectsData = studentResults.map(r => {
        const caTotal = (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0);
        caSumTotal += caTotal;
        const subScores = subjectScores[r.subjectId] || [];
        const myScoreEntry = subScores.find(s => s.studentId === student.id);
        const highestInClass = subScores.length > 0 ? Math.max(...subScores.map(s => s.score)) : caTotal;
        const lowestInClass = subScores.length > 0 ? Math.min(...subScores.map(s => s.score)) : caTotal;
        const avgInClass = subScores.length > 0 ? subScores.reduce((sum, s) => sum + s.score, 0) / subScores.length : caTotal;

        return {
          id: r.id,
          subject: { name: r.subject.name },
          assignment1Score: r.assignment1Score,
          assignment2Score: r.assignment2Score,
          test1Score: r.test1Score,
          test2Score: r.test2Score,
          totalScore: caTotal,
          position: myScoreEntry ? myScoreEntry.position : 'N/A',
          highestInClass, lowestInClass, averageInClass: avgInClass,
          outOf: subScores.length,
          grade: getGrade(caTotal, schoolSettings.gradingSystem),
          remark: getRemark(getGrade(caTotal, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
        };
      });

      const currentStudentOverallScore = studentCATotals[student.id] || 0;
      const currentStudentOverallPosition = overallPositionsMap[student.id] || 'N/A';
      const caAverage = caSumTotal / totalSubjectsCount;

      reports.push({
        schoolSettings,
        student: {
          id: student.id,
          name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          age: calculateAge(student.dateOfBirth),
          gender: student.gender,
          photoUrl: student.user?.photoUrl || student.photoUrl,
          club: student.club || '-',
          formMaster: student.classModel?.classTeacher ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}` : 'Not Assigned',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl
        },
        term: {
          name: term.name, session: term.academicSession.name, number: termNumber,
          principalSignatureUrl: schoolSettings.principalSignatureUrl,
          nextTermBegins: nextTerm ? nextTerm.startDate : null
        },
        attendance: { totalDays: totalAttendanceDays, daysPresent: presentAttendanceDays, daysAbsent: totalAttendanceDays - presentAttendanceDays },
        performance: {
          totalScore: currentStudentOverallScore, average: caAverage, position: currentStudentOverallPosition, outOf: numStudentsInClass,
          grade: getGrade(caAverage, schoolSettings.gradingSystem), remark: getRemark(getGrade(caAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
        },
        subjects: finalSubjectsData
      });
    }

    res.json({ reports });
  } catch (error) {
    console.error('Error generating bulk progressive reports:', error);
    res.status(500).json({ error: 'Failed to generate bulk progressive reports' });
  }
});

// Get bulk term reports for a class (for teachers)
router.get('/bulk/:classId/:termId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const { startAdmission, endAdmission } = req.query;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        gradingSystem: true,
        passThreshold: true,
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true,
        principalSignatureUrl: true
      }
    });

    // Verify teacher has permission for this class
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findFirst({
        where: {
          id: parseInt(classId),
          schoolId: req.schoolId
        },
        select: { classTeacherId: true }
      });

      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch term details
    const term = await prisma.term.findFirst({
      where: {
        id: parseInt(termId),
        schoolId: req.schoolId
      },
      include: {
        academicSession: true
      }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // NEW: Fetch all subjects for the class once
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || 1;

    // Initialize reports array
    const reports = [];

    // Determine term sequence (1, 2, or 3)
    const allTerms = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const termIndex = allTerms.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;

    // Find next term
    const nextTerm = await prisma.term.findFirst({
      where: {
        schoolId: req.schoolId,
        startDate: { gt: term.startDate }
      },
      orderBy: { startDate: 'asc' }
    });

    // Helper to calculate age
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

    // NEW: Pre-calculate positions and averages for ALL students in class to avoid N+1 queries
    const allStudentsInClass = await prisma.student.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' },
      select: { id: true }
    });

    const allResultsInClass = await prisma.result.findMany({
      where: { classId: parseInt(classId), termId: parseInt(termId), schoolId: req.schoolId }
    });

    const classwideStudentTotals = {};
    allStudentsInClass.forEach(s => {
      classwideStudentTotals[s.id] = 0;
    });
    allResultsInClass.forEach(r => {
      if (classwideStudentTotals[r.studentId] !== undefined) {
        classwideStudentTotals[r.studentId] += r.totalScore || 0;
      }
    });

    const classwideAverages = Object.entries(classwideStudentTotals).map(([id, total]) => ({
      studentId: parseInt(id),
      average: total / totalSubjectsCount
    })).sort((a, b) => b.average - a.average);

    // Build student query (fetch all students in class first)
    const studentQuery = {
      classId: parseInt(classId),
      schoolId: req.schoolId
    };

    // Fetch students
    let students = await prisma.student.findMany({
      where: studentQuery,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        classModel: {
          include: {
            classTeacher: {
              select: {
                firstName: true,
                lastName: true,
                signatureUrl: true
              }
            }
          }
        }
      }
    });

    // Sort students alphabetically by name (matching the frontend display order)
    students.sort((a, b) => {
      const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim().toLowerCase();
      const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Apply Range Filter using array slicing based on sorted order
    if (startAdmission || endAdmission) {
      let startIndex = 0;
      let endIndex = students.length - 1;

      if (startAdmission) {
        const foundIndex = students.findIndex(s => s.admissionNumber === startAdmission);
        if (foundIndex !== -1) startIndex = foundIndex;
      }

      if (endAdmission) {
        const foundIndex = students.findIndex(s => s.admissionNumber === endAdmission);
        if (foundIndex !== -1) endIndex = foundIndex;
      }

      // Ensure start is before end just in case they selected them backwards
      const actualStart = Math.min(startIndex, endIndex);
      const actualEnd = Math.max(startIndex, endIndex);

      students = students.slice(actualStart, actualEnd + 1);
    }

    // Fetch all attendance for the class in this term for efficient lookup
    const allAttendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: req.schoolId,
        studentId: { in: allStudentsInClass.map(s => s.id) },
        termId: parseInt(termId)
      }
    });

    // Fix: Total attendance days should be the distinct dates the class had attendance taken
    const uniqueAttendanceDates = new Set();

    const attendanceByStudent = {};
    allAttendanceRecords.forEach(rec => {
      uniqueAttendanceDates.add(rec.date.toISOString());

      if (!attendanceByStudent[rec.studentId]) {
        attendanceByStudent[rec.studentId] = { present: 0 };
      }
      if (['present', 'late'].includes(rec.status)) {
        attendanceByStudent[rec.studentId].present++;
      }
    });

    const classTotalAttendanceDays = uniqueAttendanceDates.size;

    // Fetch psychomotor domains once
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // Competition Ranking logic
    const rankings = [];
    classwideAverages.forEach((curr, idx) => {
      if (idx > 0 && curr.average === classwideAverages[idx - 1].average) {
        rankings.push({ studentId: curr.studentId, position: rankings[idx - 1].position });
      } else {
        rankings.push({ studentId: curr.studentId, position: idx + 1 });
      }
    });

    for (const student of students) {
      // Fetch results for this student
      const results = await prisma.result.findMany({
        where: {
          studentId: student.id,
          termId: parseInt(termId),
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

      // Fetch previous terms' results if it's the 3rd term
      let previousTermsResults = [];
      if (termNumber === 3) {
        previousTermsResults = await prisma.result.findMany({
          where: {
            studentId: student.id,
            academicSessionId: term.academicSessionId,
            termId: { in: allTerms.slice(0, 2).map(t => t.id) },
            schoolId: req.schoolId
          }
        });
      }

      // Calculate term average using pre-fetched data
      const studentTotal = classwideStudentTotals[student.id] || 0;
      const termAverage = studentTotal / totalSubjectsCount;

      const termPosition = rankings.find(r => r.studentId === student.id)?.position || '-';
      const totalStudentsCount = allStudentsInClass.length;

      // Fetch report card extras (remarks & psychomotor)
      const reportExtras = await prisma.studentReportCard.findFirst({
        where: {
          studentId: parseInt(student.id),
          termId: parseInt(termId),
          schoolId: req.schoolId
        }
      });

      const studentRatings = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
      const att = attendanceByStudent[student.id] || { total: 0, present: 0 };

      reports.push({
        student: {
          id: student.id,
          name: student.middleName ? `${student.user.firstName} ${student.user.lastName} ${student.middleName}` : `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          age: calculateAge(student.dateOfBirth),
          gender: student.gender,
          photoUrl: student.user?.photoUrl || student.photoUrl,
          clubs: student.clubs || 'None Assigned',
          formMaster: student.classModel?.classTeacher
            ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
            : 'Not Assigned',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl
        },
        term: {
          id: term.id,
          name: term.name,
          number: termNumber,
          session: term.academicSession.name,
          startDate: term.startDate,
          endDate: term.endDate,
          nextTermStartDate: nextTerm?.startDate || null,
          nextTermBegins: term.nextTermBeginsDate
            ? new Date(term.nextTermBeginsDate)
            : (term.endDate ? new Date(new Date(term.endDate).getTime() + 14 * 24 * 60 * 60 * 1000) : null),
          principalSignatureUrl: schoolSettings.principalSignatureUrl,
          weights: {
            assignment1: schoolSettings.assignment1Weight,
            assignment2: schoolSettings.assignment2Weight,
            test1: schoolSettings.test1Weight,
            test2: schoolSettings.test2Weight,
            exam: schoolSettings.examWeight
          }
        },
        attendance: {
          present: att.present || 0,
          total: classTotalAttendanceDays || 0,
          percentage: classTotalAttendanceDays > 0 ? ((att.present / classTotalAttendanceDays) * 100).toFixed(1) : 0
        },
        subjects: classSubjects.map(cs => {
          const result = results.find(r => r.subjectId === cs.subjectId);

          // Cumulative data for term 3
          let t1Score = null;
          let t2Score = null;
          let cumulativeAvg = null;

          if (termNumber === 3) {
            const t1 = previousTermsResults.find(r => r.subjectId === cs.subjectId && r.termId === allTerms[0].id);
            const t2 = previousTermsResults.find(r => r.subjectId === cs.subjectId && r.termId === allTerms[1].id);
            t1Score = t1 ? t1.totalScore : 0;
            t2Score = t2 ? t2.totalScore : 0;
            cumulativeAvg = (t1Score + t2Score + (result ? result.totalScore : 0)) / 3;
          }

          return {
            id: cs.subjectId,
            name: cs.subject?.name || 'Unknown Subject',
            assignment1: result ? result.assignment1Score : 0,
            assignment2: result ? result.assignment2Score : 0,
            test1: result ? result.test1Score : 0,
            test2: result ? result.test2Score : 0,
            exam: result ? result.examScore : 0,
            total: result ? result.totalScore : 0,
            grade: result ? result.grade : getGrade(0, schoolSettings.gradingSystem),
            position: result ? result.positionInClass : '-',
            classAverage: result ? result.classAverage : 0,
            remark: result ? getRemark(result.grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
            // Cumulative fields
            term1Score: t1Score,
            term2Score: t2Score,
            cumulativeAverage: cumulativeAvg
          };
        }),
        termAverage: termAverage,
        termPosition: termPosition,
        totalStudents: totalStudentsCount,
        overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        // Extras
        formMasterRemark: reportExtras?.formMasterRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        principalRemark: reportExtras?.principalRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        psychomotorRatings: psychomotorDomains.map(d => {
          const rating = studentRatings.find(r => r.domainId === d.id);
          return {
            name: d.name,
            score: rating ? rating.score : null,
            maxScore: d.maxScore || 5
          };
        })
      });
    }

    res.json({
      reports,
      schoolSettings,
      totalStudents: reports.length
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_BULK_REPORTS',
      resource: 'TERM_REPORT',
      details: {
        classId: parseInt(classId),
        termId: parseInt(termId),
        studentCount: reports.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating bulk reports:', error);
    res.status(500).json({ error: 'Failed to generate bulk reports' });
  }
});

module.exports = router;
