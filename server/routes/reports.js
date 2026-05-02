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
const { generateAINarrative } = require('../utils/aiNarrative');

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
        examMode: true,
        examModeType: true,
        principalSignatureUrl: true,
        weekendDays: true,
        showAttendanceOnReport: true,
        showPassFailStats: true,
        showPositionOnReport: true,
        showFeesOnReport: true
      }
    });

    const weekendIndices = (schoolSettings?.weekendDays || "").split(',').map(n => n.trim()).filter(n => n !== "").map(n => parseInt(n));

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
          select: {
            id: true,
            schoolId: true,
            name: true,
            arm: true,
            showPositionOnReport: true,
            showFeesOnReport: true,
            showAttendanceOnReport: true,
            reportLayout: true,
            classTeacherId: true,
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

    // Determine the denominator for attendance.
    // If term dates are set, we can calculate the total possible school days (excluding weekends/holidays)
    // to provide a more realistic "Full Term" denominator.
    const recordedAttendanceDays = classAttendanceDays.length;
    let totalAttendanceDays = recordedAttendanceDays;

    if (term.startDate && term.endDate) {
      const holidays = await prisma.schoolHoliday.findMany({
        where: { schoolId: req.schoolId, date: { gte: term.startDate, lte: term.endDate } },
        select: { date: true, type: true }
      });

      // Calculate business days between start and today (or end if term has passed)
      const now = new Date();
      const calculationEndDate = term.endDate < now ? new Date(term.endDate) : now;
      calculationEndDate.setUTCHours(23, 59, 59, 999);

      let businessDaysSoFar = 0;
      let d = new Date(term.startDate);
      d.setUTCHours(0, 0, 0, 0);

      while (d <= calculationEndDate) {
        const dayOfWeek = d.getUTCDay();
        const isConfiguredWeekend = weekendIndices.includes(dayOfWeek);
        
        // A day is a holiday if:
        // 1. It's a configured weekend (dynamic settings)
        // 2. It's a database holiday record (that is NOT a 'weekend' type record OR it's also a configured weekend)
        const hasHolidayRecord = holidays.some(h => {
          const hDate = new Date(h.date);
          hDate.setUTCHours(0, 0, 0, 0);
          return hDate.getTime() === d.getTime() && (h.type !== 'weekend' || isConfiguredWeekend);
        });

        if (!isConfiguredWeekend && !hasHolidayRecord) {
          businessDaysSoFar++;
        }
        d.setUTCDate(d.getUTCDate() + 1);
      }

      // Use the maximum of recorded days and business days so far to avoid confusion
      // If they marked attendance on a weekend (rare but possible), recorded days might be higher.
      totalAttendanceDays = Math.max(recordedAttendanceDays, businessDaysSoFar);
    }

    const presentAttendanceDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        status: { in: ['present', 'late'] }
      }
    });

    const absentAttendanceDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        status: 'absent'
      }
    });

    const studentTotalRecordedDays = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId)
      }
    });

    const unmarkedAttendanceDays = totalAttendanceDays - studentTotalRecordedDays;

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
      const parsed = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
      ratings = Array.isArray(parsed) ? parsed : [];
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

    // Determine term sequence and total terms in session
    const allTerms = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });
    const totalTerms = allTerms.length;
    const termIndex = allTerms.findIndex(t => t.id === parseInt(termId));
    const termNumber = termIndex + 1;
    const isFinalTerm = termIndex === totalTerms - 1;

    // Fetch previous terms' results if it's the final term
    let previousTermsResults = [];
    if (isFinalTerm && totalTerms > 1) {
      previousTermsResults = await prisma.result.findMany({
        where: {
          studentId: parseInt(studentId),
          academicSessionId: term.academicSessionId,
          termId: { in: allTerms.slice(0, termIndex).map(t => t.id) },
          schoolId: req.schoolId
        }
      });
    }

    const reportData = {
      student: {
        id: student.id,
        name: (() => {
          const fName = student.user?.firstName || '';
          const lName = student.user?.lastName || '';
          const mName = student.middleName || '';
          const legacyName = student.name || '';
          if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
          return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
        })(),
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
      attendance: (schoolSettings.showAttendanceOnReport && (student.classModel?.showAttendanceOnReport !== false)) ? {
        present: presentAttendanceDays,
        absent: absentAttendanceDays,
        unmarked: unmarkedAttendanceDays > 0 ? unmarkedAttendanceDays : 0,
        total: totalAttendanceDays,
        percentage: totalAttendanceDays > 0 ? ((presentAttendanceDays / totalAttendanceDays) * 100).toFixed(1) : 0
      } : null,
      subjects: (() => {
        const uniqueSubjects = new Map();
        classSubjects.forEach(cs => uniqueSubjects.set(cs.subjectId, { id: cs.subjectId, name: cs.subject?.name }));
        results.forEach(r => {
          if (!uniqueSubjects.has(r.subjectId)) {
            uniqueSubjects.set(r.subjectId, { id: r.subjectId, name: r.subject?.name });
          }
        });
        const combinedSubjects = Array.from(uniqueSubjects.values());

        return combinedSubjects.map(cs => {
          const result = results.find(r => r.subjectId === cs.id);

          // Cumulative data for dynamic final term
          let t1Score = null;
          let t2Score = null;
          let cumulativeAvg = null;

          if (isFinalTerm && totalTerms > 1) {
            // Map scores from previous terms dynamically
            // t1Score = term 1, t2Score = term 2 (if exists)
            const firstTerm = allTerms[0];
            const secondTerm = totalTerms > 2 ? allTerms[1] : null;
            
            const r1 = previousTermsResults.find(r => r.subjectId === cs.id && r.termId === firstTerm.id);
            t1Score = r1 ? r1.totalScore : 0;
            
            if (secondTerm) {
              const r2 = previousTermsResults.find(r => r.subjectId === cs.id && r.termId === secondTerm.id);
              t2Score = r2 ? r2.totalScore : 0;
            }

            const currentTotal = result ? result.totalScore : 0;
            const sessionTotal = t1Score + (t2Score || 0) + currentTotal;
            cumulativeAvg = sessionTotal / totalTerms;
          }

          return {
            id: cs.id,
            name: cs.name || 'Unknown Subject',
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
        });
      })(),
      passFailSummary: {
        totalPassed: results.filter(r => r.totalScore >= schoolSettings.passThreshold).length,
        totalFailed: results.filter(r => r.totalScore < schoolSettings.passThreshold).length,
        show: schoolSettings.showPassFailStats
      },
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
      feeSummary: feeSummary,
      aiNarrative: reportExtras?.aiNarrative || null,
      reportSettings: {
        showPositionOnReport: schoolSettings.showPositionOnReport && (student.classModel?.showPositionOnReport !== false),
        showFeesOnReport: schoolSettings.showFeesOnReport && (student.classModel?.showFeesOnReport !== false),
        showAttendanceOnReport: schoolSettings.showAttendanceOnReport && (student.classModel?.showAttendanceOnReport !== false),
        reportLayout: student.classModel?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
        reportColorScheme: schoolSettings.reportColorScheme,
        reportFontFamily: schoolSettings.reportFontFamily
      }
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

// Generate AI Performance Narrative
router.post('/generate-narrative/:studentId/:termId', authenticate, authorize(['admin', 'teacher', 'principal', 'superadmin']), async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    // 1. Fetch all data needed for the narrative (reuse logic from GET /term)
    // For brevity, we'll re-fetch the report data by calling an internal helper or just duplicating the core logic.
    // In a production app, refactor the GET code into a shared function. 
    // Here we'll just fetch enough for the AI:
    
    const reportDataRes = await api_internal_get_report_data(req.schoolId, studentId, termId);
    
    // Fetch school for AI keys
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { geminiApiKey: true, groqApiKey: true }
    });

    const narrative = await generateAINarrative(reportDataRes, school);

    // 2. Save to StudentReportCard
    const term = await prisma.term.findUnique({ where: { id: parseInt(termId) } });
    
    await prisma.studentReportCard.upsert({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: term.academicSessionId
        }
      },
      update: { aiNarrative: narrative },
      create: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        academicSessionId: term.academicSessionId,
        classId: reportDataRes.student.classId, // We'll need to ensure classId is available
        aiNarrative: narrative
      }
    });

    res.json({ narrative });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE_AI_NARRATIVE',
      resource: 'STUDENT_REPORT_CARD',
      details: { studentId: parseInt(studentId), termId: parseInt(termId) },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error in AI narrative generation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk Generate AI narratives for a class
router.post('/bulk-generate-narratives/:classId/:termId', authenticate, authorize(['admin', 'principal', 'superadmin', 'teacher']), async (req, res) => {
  try {
    const { classId, termId } = req.params;
    
    // Fetch all students in the class
    const students = await prisma.student.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' },
      select: { id: true }
    });

    if (students.length === 0) {
      return res.status(404).json({ error: 'No active students found in this class.' });
    }

    // Fetch school for AI keys
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { geminiApiKey: true, groqApiKey: true }
    });

    if (!school.geminiApiKey && !school.groqApiKey) {
      return res.status(400).json({ error: 'AI service not configured for this school. Please set API keys in settings.' });
    }

    const term = await prisma.term.findUnique({ where: { id: parseInt(termId) } });

    // Process in batches to avoid overwhelming the AI or rate limits
    const results = { successful: 0, failed: 0 };
    const BATCH_SIZE = 3; // Small batch size for AI
    
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (student) => {
        try {
          const reportData = await api_internal_get_report_data(req.schoolId, student.id, termId);
          const narrative = await generateAINarrative(reportData, school);

          await prisma.studentReportCard.upsert({
            where: {
              schoolId_studentId_termId_academicSessionId: {
                schoolId: req.schoolId,
                studentId: student.id,
                termId: parseInt(termId),
                academicSessionId: term.academicSessionId
              }
            },
            update: { aiNarrative: narrative },
            create: {
              schoolId: req.schoolId,
              studentId: student.id,
              termId: parseInt(termId),
              academicSessionId: term.academicSessionId,
              classId: parseInt(classId),
              aiNarrative: narrative
            }
          });
          results.successful++;
        } catch (err) {
          console.error(`Failed to generate narrative for student ${student.id}:`, err.message);
          results.failed++;
        }
      }));
    }

    res.json({ 
      message: `AI Narrative generation complete.`,
      ...results
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_GENERATE_AI_NARRATIVES',
      resource: 'STUDENT_REPORT_CARD',
      details: { classId: parseInt(classId), termId: parseInt(termId), ...results },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error in bulk AI narrative generation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Internal helper to fetch report data for AI (Simplified version of the GET route)
 */
async function api_internal_get_report_data(schoolId, studentId, termId) {
  // We'll actually just wrap the existing logic or re-calculate.
  // Since I can't easily refactor the whole GET route right now without risk,
  // I will just pull the essential stats.
  
  const student = await prisma.student.findFirst({
    where: { id: parseInt(studentId), schoolId },
    include: { user: true }
  });

  const results = await prisma.result.findMany({
    where: { studentId: parseInt(studentId), termId: parseInt(termId), schoolId },
    include: { subject: true }
  });

  const term = await prisma.term.findFirst({
    where: { id: parseInt(termId), schoolId },
    include: { academicSession: true }
  });

  const subjects = results.map(r => ({
    name: r.subject.name,
    grade: r.grade,
    total: r.totalScore
  }));

  // Simple average
  const avg = subjects.length > 0 ? subjects.reduce((acc, s) => acc + s.total, 0) / subjects.length : 0;

  return {
    student: { name: (() => {
      const fName = student.user?.firstName || '';
      const lName = student.user?.lastName || '';
      if (fName || lName) return `${fName} ${lName}`.trim();
      return student.name || 'Unknown Student';
    })(), gender: student.gender, classId: student.classId },
    subjects,
    termAverage: avg,
    term: { name: term.name }
  };
}

// Bulk term reports for an entire class
router.get('/bulk/:classId/:termId', authenticate, authorize(['admin', 'teacher', 'principal', 'superadmin', 'examination_officer']), async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const { startAdmission, endAdmission } = req.query;

    // Fetch class info with its teacher and settings
    const classInfo = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      include: { 
        classTeacher: { 
          select: { firstName: true, lastName: true, signatureUrl: true } 
        } 
      }
    });

    if (!classInfo || classInfo.schoolId !== req.schoolId) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify teacher permission
    if (req.user.role === 'teacher') {
      if (classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch school settings with all necessary fields
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
        principalSignatureUrl: true,
        weekendDays: true,
        showAttendanceOnReport: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showPassFailStats: true,
        reportLayout: true,
        reportColorScheme: true,
        reportFontFamily: true,
        schoolName: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
        schoolMotto: true
      }
    });
    if (!schoolSettings) return res.status(404).json({ error: 'School settings not found' });

    const weekendIndices = (schoolSettings?.weekendDays || "").split(',').map(n => n.trim()).filter(n => n !== "").map(n => parseInt(n));

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

    // Verify teacher permission
    if (req.user.role === 'teacher') {
      if (classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

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

    // Fetch ALL results for these students at once (efficient and consistent)
    const allResults = await prisma.result.findMany({
      where: { 
        studentId: { in: students.map(s => s.id) }, 
        termId: parseInt(termId), 
        schoolId: req.schoolId 
      },
      include: { subject: true }
    });

    // Calculate positions using all active students in class (Competition Ranking)
    const resultsSummary = await prisma.result.groupBy({
      by: ['studentId'],
      where: {
        classId: parseInt(classId), termId: parseInt(termId), schoolId: req.schoolId,
        student: { status: 'active' }
      },
      _sum: { totalScore: true },
      _count: { subjectId: true }
    });

    const sortedAverages = resultsSummary
      .map(entry => {
        const studentSubjCount = Math.max(classSubjects.length, entry._count.subjectId, 1);
        return { studentId: entry.studentId, average: (entry._sum.totalScore || 0) / studentSubjCount };
      })
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

    // Determine the denominator for attendance.
    const recordedAttendanceDays = classAttendanceDays.length;
    let totalAttendanceDays = recordedAttendanceDays;

    if (term.startDate && term.endDate) {
      const holidays = await prisma.schoolHoliday.findMany({
        where: { schoolId: req.schoolId, date: { gte: term.startDate, lte: term.endDate } },
        select: { date: true, type: true }
      });

      const now = new Date();
      const calculationEndDate = term.endDate < now ? new Date(term.endDate) : now;
      calculationEndDate.setUTCHours(23, 59, 59, 999);

      let businessDaysSoFar = 0;
      let d = new Date(term.startDate);
      d.setUTCHours(0, 0, 0, 0);

      while (d <= calculationEndDate) {
        const dayOfWeek = d.getUTCDay();
        const isConfiguredWeekend = weekendIndices.includes(dayOfWeek);
        
        const hasHolidayRecord = holidays.some(h => {
          const hDate = new Date(h.date);
          hDate.setUTCHours(0, 0, 0, 0);
          return hDate.getTime() === d.getTime() && (h.type !== 'weekend' || isConfiguredWeekend);
        });

        if (!isConfiguredWeekend && !hasHolidayRecord) {
          businessDaysSoFar++;
        }
        d.setUTCDate(d.getUTCDate() + 1);
      }
      totalAttendanceDays = Math.max(recordedAttendanceDays, businessDaysSoFar);
    }

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

    // Fetch absent counts per student in bulk
    const absentCounts = await prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        schoolId: req.schoolId, classId: parseInt(classId), termId: parseInt(termId),
        status: 'absent'
      },
      _count: { id: true }
    });
    const absentMap = {};
    absentCounts.forEach(a => { absentMap[a.studentId] = a._count.id; });

    // Fetch total recorded days per student in bulk (to calculate unmarked)
    const totalRecordedCounts = await prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        schoolId: req.schoolId, classId: parseInt(classId), termId: parseInt(termId)
      },
      _count: { id: true }
    });
    const totalRecordedMap = {};
    totalRecordedCounts.forEach(a => { totalRecordedMap[a.studentId] = a._count.id; });

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

    // Fetch previous terms results if it's the final term
    const studentIds = students.map(s => s.id);
    let allPreviousResults = [];
    const isFinalTerm = termIndex === allTermsInSession.length - 1;
    const totalTerms = allTermsInSession.length;

    if (isFinalTerm && totalTerms > 1) {
      allPreviousResults = await prisma.result.findMany({
        where: {
          studentId: { in: studentIds },
          academicSessionId: term.academicSessionId,
          termId: { in: allTermsInSession.slice(0, termIndex).map(t => t.id) },
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

    // OPTIMIZATION: Fetch ALL fee records for these students in ONE go
    const allFeeRecords = await prisma.feeRecord.findMany({
      where: { schoolId: req.schoolId, studentId: { in: studentIds } },
      include: { Term: { select: { id: true, startDate: true } } }
    });

    // Fetch fee structures to use as defaults if no record exists
    const allFeeStructures = await prisma.classFeeStructure.findMany({
      where: { schoolId: req.schoolId, classId: parseInt(classId), academicSessionId: term.academicSessionId }
    });

    // Map fee data for easy access
    const feeMap = {};
    students.forEach(student => {
      const records = allFeeRecords.filter(r => r.studentId === student.id);
      const currentRecord = records.find(r => r.termId === parseInt(termId));
      
      // Calculate previous outstanding (Arrears)
      const prevRecords = records.filter(r => r.Term?.startDate < term.startDate);
      const prevExpected = prevRecords.reduce((sum, r) => sum + (parseFloat(r.expectedAmount) || 0), 0);
      const prevPaid = prevRecords.reduce((sum, r) => sum + (parseFloat(r.paidAmount) || 0), 0);
      const previousOutstanding = prevExpected - prevPaid;

      // Default expected from structure
      const structure = allFeeStructures.find(f => f.termId === parseInt(termId));
      const defaultExpected = student.isScholarship ? 0 : (parseFloat(structure?.amount) || 0);

      // Safe numeric parsing
      const safeParse = (val, fallback = 0) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };

      const openingBalance = safeParse(currentRecord?.openingBalance, previousOutstanding);
      const currentTermFee = safeParse(currentRecord?.expectedAmount, defaultExpected);
      const totalExpected = openingBalance + currentTermFee;
      const totalPaid = safeParse(currentRecord?.paidAmount, 0);
      const currentBalance = currentRecord ? safeParse(currentRecord.balance, 0) : (totalExpected - totalPaid);

      feeMap[student.id] = {
        currentRecord: currentRecord || { id: null, expectedAmount: currentTermFee, paidAmount: 0, balance: currentBalance, isClearedForExam: false },
        openingBalance,
        previousOutstanding,
        currentTermFee,
        totalExpected,
        totalPaid,
        currentBalance,
        grandTotal: currentBalance,
        payments: [], // Skip payments for bulk to save memory/serialiation
        expectedAmount: currentTermFee,
        balance: currentBalance,
        paidAmount: totalPaid
      };
    });

    // Generate reports for each student
    const reports = students.map((student) => {
      try {
      const studentResults = allResults.filter(r => r.studentId === student.id);
      const studentSubjCount = Math.max(classSubjects.length, studentResults.length, 1);
      const reportExtras = extrasMap[student.id];
      const rawAverage = (studentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0)) / studentSubjCount;
      const termAverage = isNaN(rawAverage) ? 0 : rawAverage;
      const termPosition = positionMap[student.id] || '-';

      let ratings = [];
      try {
        const parsed = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
        ratings = Array.isArray(parsed) ? parsed : [];
      } catch (e) { ratings = []; }

      const feeSummary = feeMap[student.id];

      const studentAttendance = (schoolSettings.showAttendanceOnReport && (classInfo?.showAttendanceOnReport !== false)) ? {
        present: attendanceMap[student.id] || 0,
        absent: absentMap[student.id] || 0,
        unmarked: Math.max(0, totalAttendanceDays - (totalRecordedMap[student.id] || 0)),
        total: totalAttendanceDays,
        percentage: totalAttendanceDays > 0 ? (((attendanceMap[student.id] || 0) / totalAttendanceDays) * 100).toFixed(1) : 0
      } : null;

      return {
        student: {
          id: student.id,
          name: (() => {
            const fName = student.user?.firstName || '';
            const lName = student.user?.lastName || '';
            const mName = student.middleName || '';
            const legacyName = student.name || '';
            if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
            return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
          })(),
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
        attendance: studentAttendance,
        subjects: (() => {
          const uniqueSubjects = new Map();
          classSubjects.forEach(cs => uniqueSubjects.set(cs.subjectId, { id: cs.subjectId, name: cs.subject?.name }));
          studentResults.forEach(r => {
            if (!uniqueSubjects.has(r.subjectId)) {
              uniqueSubjects.set(r.subjectId, { id: r.subjectId, name: r.subject?.name });
            }
          });
          const combinedSubjects = Array.from(uniqueSubjects.values());

          return combinedSubjects.map(cs => {
            const result = studentResults.find(r => r.subjectId === cs.id);
            let t1Score = null, t2Score = null, cumulativeAvg = null;
            if (isFinalTerm && totalTerms > 1) {
              const prevTermScores = allPreviousResults.filter(r => r.studentId === student.id);
              
              // Map scores from previous terms
              const firstTerm = allTermsInSession[0];
              const secondTerm = totalTerms > 2 ? allTermsInSession[1] : null;
              
              const r1 = prevTermScores.find(r => r.subjectId === cs.id && r.termId === firstTerm.id);
              t1Score = r1 ? r1.totalScore : 0;
              
              if (secondTerm) {
                const r2 = prevTermScores.find(r => r.subjectId === cs.id && r.termId === secondTerm.id);
                t2Score = r2 ? r2.totalScore : 0;
              }

              const currentTotal = result ? result.totalScore : 0;
              const sessionTotal = t1Score + (t2Score || 0) + currentTotal;
              cumulativeAvg = sessionTotal / totalTerms;
            }
            return {
              id: cs.id,
              name: cs.name || 'Unknown Subject',
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
          });
        })(),
        termAverage,
        termPosition,
        totalStudents,
        passFailSummary: {
          totalPassed: studentResults.filter(r => r.totalScore >= schoolSettings.passThreshold).length,
          totalFailed: studentResults.filter(r => r.totalScore < schoolSettings.passThreshold).length,
          show: schoolSettings.showPassFailStats
        },
        overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        formMasterRemark: reportExtras?.formMasterRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        principalRemark: reportExtras?.principalRemark || getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        psychomotorRatings: psychomotorDomains.map(d => {
          const rating = Array.isArray(ratings) ? ratings.find(r => r.domainId === d.id) : null;
          return { name: d.name, score: rating ? rating.score : null, maxScore: d.maxScore || 5 };
        }),
        feeSummary: feeSummary,
        reportSettings: {
          showPositionOnReport: schoolSettings.showPositionOnReport && (classInfo?.showPositionOnReport !== false),
          showFeesOnReport: schoolSettings.showFeesOnReport && (classInfo?.showFeesOnReport !== false),
          showAttendanceOnReport: schoolSettings.showAttendanceOnReport && (classInfo?.showAttendanceOnReport !== false),
          reportLayout: classInfo?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
          reportColorScheme: schoolSettings.reportColorScheme,
          reportFontFamily: schoolSettings.reportFontFamily
        }
      };
      } catch (err) {
        console.error(`[BulkReports] Error processing student ${student.id}:`, err);
        return null;
      }
    }).filter(r => r !== null);

    res.json({ reports, totalStudents: reports.length });

    logAction({
      schoolId: req.schoolId, userId: req.user.id,
      action: 'GENERATE_BULK_REPORTS', resource: 'TERM_REPORT',
      details: { classId: parseInt(classId), termId: parseInt(termId), count: reports.length },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating bulk reports:', error);
    console.error(`[BulkReports] Error: ${error.message}`, error.stack);
    res.status(500).json({ 
      error: `Failed to generate bulk reports: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Bulk cumulative reports for an entire class (Full Session)
router.get('/bulk-cumulative/:classId/:sessionId', authenticate, authorize(['admin', 'teacher', 'principal', 'superadmin', 'examination_officer']), async (req, res) => {
  try {
    const { classId, sessionId } = req.params;

    const classInfo = await prisma.class.findFirst({
      where: { id: parseInt(classId), schoolId: req.schoolId },
      select: { classTeacherId: true }
    });

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify teacher permission
    if (req.user.role === 'teacher') {
      if (classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        gradingSystem: true,
        passThreshold: true,
        principalSignatureUrl: true,
        reportLayout: true,
        reportColorScheme: true,
        reportFontFamily: true
      }
    });

    // Fetch all terms in this session
    const sessionTerms = await prisma.term.findMany({
      where: { academicSessionId: parseInt(sessionId), schoolId: req.schoolId },
      orderBy: { startDate: 'asc' }
    });

    if (sessionTerms.length === 0) {
      return res.status(404).json({ error: 'No terms found for this session' });
    }

    // Fetch all active students in class
    const students = await prisma.student.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId, status: 'active' },
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: {
          include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });

    if (students.length === 0) return res.json({ reports: [] });

    // Fetch all class subjects
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: req.schoolId },
      include: { subject: true }
    });
    const totalSubjectsCount = classSubjects.length || 1;

    // Fetch ALL results for the whole session for these students
    const allSessionResults = await prisma.result.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        academicSessionId: parseInt(sessionId),
        schoolId: req.schoolId
      }
    });

    // Calculate session averages and positions
    const studentScores = students.map(student => {
      const studentResults = allSessionResults.filter(r => r.studentId === student.id);
      const sessionTotal = studentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      return {
        studentId: student.id,
        sessionAverage: sessionTotal / (totalSubjectsCount * sessionTerms.length)
      };
    });

    const sortedAverages = [...studentScores].sort((a, b) => b.sessionAverage - a.sessionAverage);
    const positionMap = {};
    let rank = 0;
    let prevAvg = -1;
    let currentPos = 1;
    sortedAverages.forEach((s, i) => {
      rank++;
      if (s.sessionAverage !== prevAvg) currentPos = rank;
      positionMap[s.studentId] = currentPos;
      prevAvg = s.sessionAverage;
    });

    // Fetch psychomotor domains once
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: req.schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // Fetch report extras for the whole class
    const allReportExtras = await prisma.studentReportCard.findMany({
      where: { academicSessionId: parseInt(sessionId), schoolId: req.schoolId }
    });

    // Build the reports
    const reports = students.map(student => {
      const studentResults = allSessionResults.filter(r => r.studentId === student.id);
      const studentExtras = allReportExtras.find(e => e.studentId === student.id) || {};
      
      const sessionAvg = studentScores.find(s => s.studentId === student.id).sessionAverage;
      
      let ratings = [];
      try {
        const parsed = studentExtras.psychomotorRatings ? JSON.parse(studentExtras.psychomotorRatings) : [];
        ratings = Array.isArray(parsed) ? parsed : [];
      } catch (e) { ratings = []; }

      return {
        student: {
          id: student.id,
          name: (() => {
            const fName = student.user?.firstName || '';
            const lName = student.user?.lastName || '';
            const mName = student.middleName || '';
            const legacyName = student.name || '';
            if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
            return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
          })(),
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          photoUrl: student.user?.photoUrl || student.photoUrl,
          formMaster: student.classModel?.classTeacher ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}` : 'N/A',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
        },
        session: {
          name: sessionTerms[0]?.academicSession?.name || 'N/A',
          totalTerms: sessionTerms.length,
          principalSignatureUrl: schoolSettings.principalSignatureUrl || null
        },
        subjects: classSubjects.map(cs => {
          const subjectResults = studentResults.filter(r => r.subjectId === cs.subjectId);
          const termScores = sessionTerms.map(t => {
            const r = subjectResults.find(res => res.termId === t.id);
            return r ? r.totalScore : null;
          });
          const subjectTotal = termScores.reduce((a, b) => a + (b || 0), 0);
          const subjectAvg = subjectTotal / sessionTerms.length;

          return {
            id: cs.subjectId,
            name: cs.subject?.name || 'Unknown',
            termScores,
            sessionAverage: subjectAvg,
            grade: getGrade(subjectAvg, schoolSettings.gradingSystem),
            remark: getRemark(getGrade(subjectAvg, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
          };
        }),
        sessionAverage: sessionAvg,
        sessionPosition: positionMap[student.id],
        totalStudents: students.length,
        overallGrade: getGrade(sessionAvg, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(sessionAvg, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        psychomotorRatings: psychomotorDomains.map(d => {
          const r = Array.isArray(ratings) ? ratings.find(rate => rate.domainId === d.id) : null;
          return { name: d.name, score: r ? r.score : null, maxScore: d.maxScore || 5 };
        }),
        reportSettings: {
          reportLayout: student.classModel?.reportLayout || schoolSettings.reportLayout || 'classic',
          reportColorScheme: schoolSettings.reportColorScheme,
          reportFontFamily: schoolSettings.reportFontFamily
        }
      };
    });

    res.json({ reports });

  } catch (error) {
    console.error('Error generating bulk cumulative reports:', error);
    res.status(500).json({ error: `Failed to generate bulk cumulative reports: ${error.message}` });
  }
});

// Get cumulative report (all three terms)
router.get('/cumulative/:studentId/:sessionId', authenticate, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { 
        gradingSystem: true, 
        passThreshold: true, 
        principalSignatureUrl: true,
        reportColorScheme: true,
        reportFontFamily: true,
        reportLayout: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true
      }
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

    // Fetch last term in session to get the latest fee record/standing
    const lastTermInSession = await prisma.term.findFirst({
      where: {
        academicSessionId: parseInt(sessionId),
        schoolId: req.schoolId
      },
      orderBy: { startDate: 'desc' }
    });

    if (!lastTermInSession) {
      return res.status(404).json({ error: 'No terms found for this session.' });
    }

    const isFinalTerm = lastTermInSession.isCurrent || (new Date() >= new Date(lastTermInSession.startDate));

    // Check permissions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      if (student.classModel) {
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
            message: 'The cumulative report is only available after the final term results have been published.'
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
        termScores: session.terms.map(() => 0), // Dynamic array for scores
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
          subjectsMap[r.subjectId].termScores[i] = score;
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
      // Progressive Average Logic: 
      // If it's not the final term yet, average by terms-to-date (s.count).
      // If it's the final term, average by the total session length.
      const divisor = isFinalTerm ? session.terms.length : (s.count > 0 ? s.count : session.terms.length);
      const avg = s.count > 0 ? s.total / divisor : 0; 
      
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

    // Attendance (Session-wide)
    const sessionAttendance = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        Term: { academicSessionId: parseInt(sessionId) }
      }
    });

    const sessionPresent = await prisma.attendanceRecord.count({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        Term: { academicSessionId: parseInt(sessionId) },
        status: { in: ['present', 'late'] }
      }
    });

    // Financial Standing
    const rawFeeSummary = await getStudentFeeSummary(req.schoolId, parseInt(studentId), parseInt(sessionId), lastTermInSession.id);
    const feeSummary = {
      ...rawFeeSummary,
      status: rawFeeSummary.currentBalance <= 0 ? 'Cleared' : 'Owing'
    };

    // Determine promotion status
    const isPromoted = sessionAverage >= (schoolSettings.passThreshold || 40);
    const nextClass = isPromoted ? 'Promoted' : 'Repeat Class';

    res.json({
      student: {
        id: student.id,
        name: (() => {
          const fName = student.user?.firstName || '';
          const lName = student.user?.lastName || '';
          const mName = student.middleName || '';
          const legacyName = student.name || '';
          if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
          return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
        })(),
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
      attendance: {
         total: sessionAttendance,
         present: sessionPresent,
         absent: sessionAttendance - sessionPresent
      },
      feeSummary,
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
      nextClass: nextClass,
      reportSettings: {
        showPositionOnReport: schoolSettings.showPositionOnReport && (student.classModel?.showPositionOnReport !== false),
        showFeesOnReport: schoolSettings.showFeesOnReport && (student.classModel?.showFeesOnReport !== false),
        showAttendanceOnReport: schoolSettings.showAttendanceOnReport && (student.classModel?.showAttendanceOnReport !== false),
        reportLayout: student.classModel?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
        reportColorScheme: schoolSettings.reportColorScheme,
        reportFontFamily: schoolSettings.reportFontFamily
      }
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
        principalSignatureUrl: true,
        reportColorScheme: true,
        reportFontFamily: true,
        reportLayout: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true
      }
    });

    const classInfo = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      select: {
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true,
        reportLayout: true
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

      // Attendance (Bulk Session-wide)
      const sessionAttendance = await prisma.attendanceRecord.count({
        where: { schoolId: req.schoolId, studentId: student.id, Term: { academicSessionId: parseInt(sessionId) } }
      });
      const sessionPresent = await prisma.attendanceRecord.count({
        where: { schoolId: req.schoolId, studentId: student.id, Term: { academicSessionId: parseInt(sessionId) }, status: { in: ['present', 'late'] } }
      });

      // Financial Standing (Bulk)
      const lastTermId = session.terms[session.terms.length - 1]?.id;
      const rawFeeSummary = await getStudentFeeSummary(req.schoolId, student.id, parseInt(sessionId), lastTermId);
      const feeSummary = {
        ...rawFeeSummary,
        status: rawFeeSummary.currentBalance <= 0 ? 'Cleared' : 'Owing'
      };

      const cumulativeSubjects = Object.values(subjectsMap).map(s => {
        const avg = s.count > 0 ? s.total / session.terms.length : 0;
        return { ...s, average: avg, grade: getGrade(avg, schoolSettings.gradingSystem) };
      }).sort((a, b) => a.name.localeCompare(b.name));

      reports.push({
        schoolSettings,
        student: {
          id: student.id,
          name: (() => {
            const fName = student.user?.firstName || '';
            const lName = student.user?.lastName || '';
            const mName = student.middleName || '';
            const legacyName = student.name || '';
            if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
            return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
          })(),
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          photoUrl: student.user?.photoUrl || student.photoUrl,
          formMaster: student.classModel?.classTeacher ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}` : 'Not Assigned',
          formMasterSignatureUrl: student.classModel?.classTeacher?.signatureUrl || null
        },
        attendance: { total: sessionAttendance, present: sessionPresent, absent: sessionAttendance - sessionPresent },
        feeSummary,
        aiNarrative: schoolSettings.geminiApiKey || schoolSettings.groqApiKey ? await generateAINarrative({
          student: { 
            name: (() => {
              const fName = student.user?.firstName || '';
              const lName = student.user?.lastName || '';
              const mName = student.middleName || '';
              const legacyName = student.name || '';
              if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim();
              return legacyName || mName || `Student (${student.admissionNumber || student.id})`;
            })(), 
            gender: student.gender 
          },
          subjects: cumulativeSubjects,
          attendance: { present: sessionPresent, total: sessionAttendance, percentage: ((sessionPresent / (sessionAttendance || 1)) * 100).toFixed(1) },
          termAverage: sessionAverage
        }, schoolSettings).catch(e => null) : null,
        session: { name: session.name, principalSignatureUrl: schoolSettings.principalSignatureUrl || null },
        terms: termsData,
        subjects: cumulativeSubjects,
        overallAverage: sessionAverage,
        overallGrade: getGrade(sessionAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(sessionAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        isPromoted,
        nextClass: isPromoted ? 'Promoted' : 'Repeat Class',
        reportSettings: {
          showPositionOnReport: schoolSettings.showPositionOnReport && (classInfo?.showPositionOnReport !== false),
          showFeesOnReport: schoolSettings.showFeesOnReport && (classInfo?.showFeesOnReport !== false),
          showAttendanceOnReport: schoolSettings.showAttendanceOnReport && (classInfo?.showAttendanceOnReport !== false),
          reportLayout: classInfo?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
          reportColorScheme: schoolSettings.reportColorScheme,
          reportFontFamily: schoolSettings.reportFontFamily
        }
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
        name: (() => { const fName = student.user?.firstName || ''; const lName = student.user?.lastName || ''; const mName = student.middleName || ''; const legacyName = student.name || ''; if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim(); return legacyName || mName || `Student (${student.admissionNumber || student.id})`; })(),
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
        principalSignatureUrl: true,
        reportColorScheme: true,
        reportFontFamily: true,
        reportLayout: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true
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

    const classSettings = student?.classModel ? {
      showPositionOnReport: student.classModel.showPositionOnReport,
      showFeesOnReport: student.classModel.showFeesOnReport,
      showAttendanceOnReport: student.classModel.showAttendanceOnReport,
      reportLayout: student.classModel.reportLayout
    } : null;

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
        name: (() => { const fName = student.user?.firstName || ''; const lName = student.user?.lastName || ''; const mName = student.middleName || ''; const legacyName = student.name || ''; if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim(); return legacyName || mName || `Student (${student.admissionNumber || student.id})`; })(),
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
      subjects: finalSubjectsData,
      reportSettings: {
        showPositionOnReport: classSettings?.showPositionOnReport ?? schoolSettings.showPositionOnReport,
        showFeesOnReport: classSettings?.showFeesOnReport ?? schoolSettings.showFeesOnReport,
        showAttendanceOnReport: classSettings?.showAttendanceOnReport ?? schoolSettings.showAttendanceOnReport,
        reportLayout: classSettings?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
        reportColorScheme: schoolSettings.reportColorScheme,
        reportFontFamily: schoolSettings.reportFontFamily
      }
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
        principalSignatureUrl: true,
        reportColorScheme: true,
        reportFontFamily: true,
        reportLayout: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true
      }
    });

    const classInfo = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
      select: {
        showPositionOnReport: true,
        showFeesOnReport: true,
        showAttendanceOnReport: true,
        reportLayout: true
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
      where: { Student: { classId: parseInt(classId) }, termId: parseInt(termId), schoolId: req.schoolId },
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
          name: (() => { const fName = student.user?.firstName || ''; const lName = student.user?.lastName || ''; const mName = student.middleName || ''; const legacyName = student.name || ''; if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim(); return legacyName || mName || `Student (${student.admissionNumber || student.id})`; })(),
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
        subjects: finalSubjectsData,
        reportSettings: {
          showPositionOnReport: schoolSettings.showPositionOnReport && (classInfo?.showPositionOnReport !== false),
          showFeesOnReport: schoolSettings.showFeesOnReport && (classInfo?.showFeesOnReport !== false),
          showAttendanceOnReport: schoolSettings.showAttendanceOnReport && (classInfo?.showAttendanceOnReport !== false),
          reportLayout: classInfo?.reportLayout ?? (schoolSettings.reportLayout || 'classic'),
          reportColorScheme: schoolSettings.reportColorScheme,
          reportFontFamily: schoolSettings.reportFontFamily
        }
      });
    }

    res.json({ reports });
  } catch (error) {
    console.error('Error generating bulk progressive reports:', error);
    res.status(500).json({ error: 'Failed to generate bulk progressive reports' });
  }
});

// Get bulk term reports for a class (for teachers)


// Public verification endpoint for all report types
router.get('/verify/:type/:studentId/:targetId', async (req, res) => {
  try {
    const { type, studentId, targetId } = req.params;

    // Fetch student with basics
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: true,
        school: { select: { id: true, name: true, logoUrl: true, address: true, primaryColor: true, gradingSystem: true } }
      }
    });

    if (!student) return res.status(404).json({ error: 'Verification Failed: Student record not found.' });

    let performance = { totalScore: 0, average: 0, grade: 'N/A', remark: 'Invalid' };
    const gradingSystem = student.school.gradingSystem;

    if (type === 'term') {
      const results = await prisma.result.findMany({
        where: { studentId: parseInt(studentId), termId: parseInt(targetId) }
      });
      if (results.length === 0) return res.status(404).json({ error: 'No results found for this term.' });

      const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      const average = totalScore / (results.length || 1);
      performance = {
        totalScore,
        average,
        grade: getGrade(average, gradingSystem),
        remark: getRemark(getGrade(average, gradingSystem), gradingSystem)
      };
    } else if (type === 'progressive') {
      const results = await prisma.result.findMany({
        where: { studentId: parseInt(studentId), termId: parseInt(targetId) }
      });
      if (results.length === 0) return res.status(404).json({ error: 'No results found for this period.' });

      const caTotal = results.reduce((sum, r) => sum + (r.assignment1Score || 0) + (r.assignment2Score || 0) + (r.test1Score || 0) + (r.test2Score || 0), 0);
      const caAverage = caTotal / (results.length || 1);
      performance = {
        totalScore: caTotal,
        average: caAverage,
        grade: getGrade(caAverage, gradingSystem),
        remark: getRemark(getGrade(caAverage, gradingSystem), gradingSystem)
      };
    } else if (type === 'cumulative') {
      const results = await prisma.result.findMany({
        where: { studentId: parseInt(studentId), Term: { academicSessionId: parseInt(targetId) } }
      });
      if (results.length === 0) return res.status(404).json({ error: 'No results found for this session.' });

      const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      const average = totalScore / (results.length || 1);
      performance = {
        totalScore,
        average,
        grade: getGrade(average, gradingSystem),
        remark: getRemark(getGrade(average, gradingSystem), gradingSystem)
      };
    }

    // Determine session and term for fee verification
    let feeSessionId = type === 'cumulative' ? parseInt(targetId) : undefined;
    let feeTermId = (type === 'term' || type === 'progressive') ? parseInt(targetId) : undefined;

    if (!feeSessionId && feeTermId) {
      const termInfo = await prisma.term.findUnique({ where: { id: feeTermId } });
      feeSessionId = termInfo?.academicSessionId;
    } else if (feeSessionId && !feeTermId) {
      const lastTerm = await prisma.term.findFirst({
        where: { academicSessionId: feeSessionId, schoolId: student.schoolId },
        orderBy: { startDate: 'desc' }
      });
      feeTermId = lastTerm?.id;
    }

    // Financial Standing (Public Verification)
    const rawFeeStatus = await getStudentFeeSummary(student.schoolId, parseInt(studentId), feeSessionId, feeTermId);
    const feeStatus = rawFeeStatus ? {
      ...rawFeeStatus,
      status: rawFeeStatus.currentBalance <= 0 ? 'Cleared' : 'Owing'
    } : null;

    res.json({
      verified: true,
      student: {
        name: (() => { const fName = student.user?.firstName || ''; const lName = student.user?.lastName || ''; const mName = student.middleName || ''; const legacyName = student.name || ''; if (fName || lName) return `${fName} ${lName} ${mName}`.replace(/\s+/g, ' ').trim(); return legacyName || mName || `Student (${student.admissionNumber || student.id})`; })(),
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        photoUrl: student.user?.photoUrl || student.photoUrl
      },
      performance,
      attendance: {
         present: (await prisma.attendanceRecord.count({ where: { studentId: parseInt(studentId), status: { in: ['present', 'late'] } } })),
         total: (await prisma.attendanceRecord.count({ where: { studentId: parseInt(studentId) } }))
      },
      feeStatus,
      school: student.school
    });

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ error: 'System error during verification.' });
  }
});

module.exports = router;
