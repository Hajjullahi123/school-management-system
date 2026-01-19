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

// Get term report for a student
router.get('/term/:studentId/:termId', authenticate, async (req, res) => {
  try {
    const { studentId, termId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { gradingSystem: true, passThreshold: true }
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
            lastName: true
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

    // Check permissions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      if (!student.classModel || !student.classModel.isResultPublished) {
        return res.status(403).json({
          error: 'Result Not Published',
          message: 'The result for this class has not been published by the Form Master yet.'
        });
      }
    } else if (req.user.role === 'teacher') {
      if (!student.classModel || student.classModel.classTeacherId !== req.user.id) {
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

    console.log(`[TermReport Debug] Request Params: studentId=${studentId}, termId=${termId}, schoolId=${req.schoolId}`);
    console.log(`[TermReport Debug] Results Found: ${results.length}`);

    // NEW: Fetch all subjects for the class to ensure all appear on report
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

    // Calculate term position (rank among classmates) using total class subjects
    const classmates = await prisma.student.findMany({
      where: { classId: student.classId, schoolId: req.schoolId, status: 'active' }
    });

    const studentTotals = {};
    classmates.forEach(c => {
      studentTotals[c.id] = 0;
    });

    const classResults = await prisma.result.findMany({
      where: {
        classId: student.classId,
        termId: parseInt(termId),
        schoolId: req.schoolId
      }
    });

    classResults.forEach(result => {
      if (studentTotals[result.studentId] !== undefined) {
        studentTotals[result.studentId] += result.totalScore || 0;
      }
    });

    const averages = Object.entries(studentTotals).map(([id, total]) => ({
      studentId: parseInt(id),
      average: total / totalSubjectsCount
    })).sort((a, b) => b.average - a.average);

    const termPosition = averages.findIndex(a => a.studentId === parseInt(studentId)) + 1;
    const totalStudents = classmates.length;

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

    res.json({
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photoUrl: student.photoUrl,
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned'
      },
      term: {
        name: term.name,
        session: term.academicSession.name,
        startDate: term.startDate,
        endDate: term.endDate,
        nextTermStartDate: nextTerm?.startDate || null
      },
      subjects: classSubjects.map(cs => {
        const result = results.find(r => r.subjectId === cs.subjectId);
        return {
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
          remark: result ? getRemark(result.grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
        };
      }),
      termAverage: termAverage,
      termPosition: termPosition,
      totalStudents: totalStudents,
      overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
      overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
      // Extras
      formMasterRemark: reportExtras?.formMasterRemark || null,
      principalRemark: reportExtras?.principalRemark || null,
      psychomotorRatings: reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : []
    });

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

// Get cumulative report (all three terms)
router.get('/cumulative/:studentId/:sessionId', authenticate, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { gradingSystem: true, passThreshold: true }
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
            lastName: true
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

    // Check permissions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      if (!student.classModel || !student.classModel.isResultPublished) {
        return res.status(403).json({
          error: 'Result Not Published',
          message: 'The result for this class has not been published by the Form Master yet.'
        });
      }
    } else if (req.user.role === 'teacher') {
      if (!student.classModel || student.classModel.classTeacherId !== req.user.id) {
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
    for (const term of session.terms) {
      const results = await prisma.result.findMany({
        where: {
          studentId: parseInt(studentId),
          termId: term.id,
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

      const termAverage = await calculateStudentTermAverage(
        prisma,
        parseInt(studentId),
        term.id,
        req.schoolId,
        totalSubjectsCount
      );

      termsData.push({
        termName: term.name,
        subjects: classSubjects.map(cs => {
          const result = results.find(r => r.subjectId === cs.subjectId);
          return {
            name: cs.subject?.name || 'Unknown Subject',
            assignment1: result ? result.assignment1Score : 0,
            assignment2: result ? result.assignment2Score : 0,
            test1: result ? result.test1Score : 0,
            test2: result ? result.test2Score : 0,
            exam: result ? result.examScore : 0,
            total: result ? result.totalScore : 0,
            grade: result ? result.grade : getGrade(0, schoolSettings.gradingSystem),
            position: result ? result.positionInClass : '-'
          };
        }),
        average: termAverage,
        grade: getGrade(termAverage, schoolSettings.gradingSystem)
      });
    }

    // Calculate overall session average
    const sessionAverage = await calculateStudentSessionAverage(
      prisma,
      parseInt(studentId),
      parseInt(sessionId),
      req.schoolId,
      totalSubjectsCount * session.terms.length // Cumulative average should be over all expected results across terms
    );

    // Determine promotion status
    const isPromoted = sessionAverage >= (schoolSettings.passThreshold || 40);
    const nextClass = isPromoted ? 'Promoted' : 'Repeat Class';

    res.json({
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photoUrl: student.photoUrl,
        formMaster: student.classModel?.classTeacher
          ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
          : 'Not Assigned'
      },
      session: {
        name: session.name
      },
      terms: termsData,
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
            lastName: true
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
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
        gender: student.gender,
        photoUrl: student.photoUrl,
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

// Get bulk term reports for a class (for teachers)
router.get('/bulk/:classId/:termId', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const { startAdmission, endAdmission } = req.query;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: { gradingSystem: true, passThreshold: true }
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

    // Build student query
    const studentQuery = {
      classId: parseInt(classId),
      schoolId: req.schoolId
    };

    // Add admission number range filter if provided
    if (startAdmission && endAdmission) {
      studentQuery.admissionNumber = {
        gte: startAdmission,
        lte: endAdmission
      };
    } else if (startAdmission) {
      studentQuery.admissionNumber = {
        gte: startAdmission
      };
    } else if (endAdmission) {
      studentQuery.admissionNumber = {
        lte: endAdmission
      };
    }

    // Fetch students
    const students = await prisma.student.findMany({
      where: studentQuery,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
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
      },
      orderBy: {
        admissionNumber: 'asc'
      }
    });

    // Fetch results for all students
    const reports = [];

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

      // Calculate term average using pre-fetched data
      const studentTotal = classwideStudentTotals[student.id] || 0;
      const termAverage = studentTotal / totalSubjectsCount;

      const termPosition = classwideAverages.findIndex(a => a.studentId === student.id) + 1;
      const totalStudentsCount = allStudentsInClass.length;

      // Fetch report card extras (remarks & psychomotor)
      const reportExtras = await prisma.studentReportCard.findFirst({
        where: {
          studentId: parseInt(student.id),
          termId: parseInt(termId),
          schoolId: req.schoolId
        }
      });

      reports.push({
        student: {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm || ''}` : 'N/A',
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          photoUrl: student.photoUrl,
          formMaster: student.classModel?.classTeacher
            ? `${student.classModel.classTeacher.firstName} ${student.classModel.classTeacher.lastName}`
            : 'Not Assigned'
        },
        term: {
          name: term.name,
          session: term.academicSession.name,
          startDate: term.startDate,
          endDate: term.endDate,
          nextTermStartDate: nextTerm?.startDate || null
        },
        subjects: classSubjects.map(cs => {
          const result = results.find(r => r.subjectId === cs.subjectId);
          return {
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
            remark: result ? getRemark(result.grade, schoolSettings.gradingSystem) : getRemark(getGrade(0, schoolSettings.gradingSystem), schoolSettings.gradingSystem)
          };
        }),
        termAverage: termAverage,
        termPosition: termPosition,
        totalStudents: totalStudentsCount,
        overallGrade: getGrade(termAverage, schoolSettings.gradingSystem),
        overallRemark: getRemark(getGrade(termAverage, schoolSettings.gradingSystem), schoolSettings.gradingSystem),
        // Extras
        formMasterRemark: reportExtras?.formMasterRemark || null,
        principalRemark: reportExtras?.principalRemark || null,
        psychomotorRatings: reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : []
      });
    }

    res.json({
      reports,
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
