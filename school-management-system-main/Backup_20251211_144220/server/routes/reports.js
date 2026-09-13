const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
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

    // Fetch student with all details
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
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

    // Fetch term details
    const term = await prisma.term.findUnique({
      where: { id: parseInt(termId) },
      include: {
        academicSession: true
      }
    });

    // Fetch all results for this student in this term
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId)
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

    // Calculate term average
    const termAverage = await calculateStudentTermAverage(
      prisma,
      parseInt(studentId),
      parseInt(termId)
    );

    // Calculate term position (rank among classmates)
    const classResults = await prisma.result.findMany({
      where: {
        classId: student.classId,
        termId: parseInt(termId)
      },
      include: {
        student: true
      }
    });

    // Group by student and calculate averages
    const studentAverages = {};
    classResults.forEach(result => {
      if (!studentAverages[result.studentId]) {
        studentAverages[result.studentId] = {
          total: 0,
          count: 0
        };
      }
      studentAverages[result.studentId].total += result.totalScore;
      studentAverages[result.studentId].count += 1;
    });

    const averages = Object.entries(studentAverages).map(([id, data]) => ({
      studentId: parseInt(id),
      average: data.total / data.count
    })).sort((a, b) => b.average - a.average);

    const termPosition = averages.findIndex(a => a.studentId === parseInt(studentId)) + 1;
    const totalStudents = averages.length;

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
        session: term.academicSession.name
      },
      subjects: results.map(result => ({
        name: result.subject.name,
        assignment1: result.assignment1Score,
        assignment2: result.assignment2Score,
        test1: result.test1Score,
        test2: result.test2Score,
        exam: result.examScore,
        total: result.totalScore,
        grade: result.grade,
        position: result.positionInClass,
        classAverage: result.classAverage,
        remark: getRemark(result.grade)
      })),
      termAverage: termAverage,
      termPosition: termPosition,
      totalStudents: totalStudents,
      overallGrade: getGrade(termAverage),
      overallRemark: getRemark(getGrade(termAverage))
    });
  } catch (error) {
    console.error('Error generating term report:', error);
    res.status(500).json({ error: 'Failed to generate term report' });
  }
});

// Get cumulative report (all three terms)
router.get('/cumulative/:studentId/:sessionId', authenticate, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;

    // Fetch student
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
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

    // Fetch session
    const session = await prisma.academicSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    });

    // Fetch results for all terms in this session
    const termsData = [];
    for (const term of session.terms) {
      const results = await prisma.result.findMany({
        where: {
          studentId: parseInt(studentId),
          termId: term.id
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
        term.id
      );

      termsData.push({
        termName: term.name,
        subjects: results.map(result => ({
          name: result.subject.name,
          assignment1: result.assignment1Score,
          assignment2: result.assignment2Score,
          test1: result.test1Score,
          test2: result.test2Score,
          exam: result.examScore,
          total: result.totalScore,
          grade: result.grade,
          position: result.positionInClass
        })),
        average: termAverage,
        grade: getGrade(termAverage)
      });
    }

    // Calculate overall session average
    const sessionAverage = await calculateStudentSessionAverage(
      prisma,
      parseInt(studentId),
      parseInt(sessionId)
    );

    // Determine promotion status
    const isPromoted = sessionAverage >= 40;
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
      overallGrade: getGrade(sessionAverage),
      overallRemark: getRemark(getGrade(sessionAverage)),
      isPromoted: isPromoted,
      nextClass: nextClass
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
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
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

    // Fetch term
    const term = await prisma.term.findUnique({
      where: { id: parseInt(termId) },
      include: {
        academicSession: true
      }
    });

    // Fetch results
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId)
      },
      include: {
        subject: true
      }
    });

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

    // Verify teacher has permission for this class
    if (req.user.role === 'teacher') {
      const classInfo = await prisma.class.findUnique({
        where: { id: parseInt(classId) },
        select: { classTeacherId: true }
      });

      if (!classInfo || classInfo.classTeacherId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the class teacher for this class' });
      }
    }

    // Fetch term details
    const term = await prisma.term.findUnique({
      where: { id: parseInt(termId) },
      include: {
        academicSession: true
      }
    });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    // Build student query
    const studentQuery = {
      classId: parseInt(classId)
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

    for (const student of students) {
      // Fetch results for this student
      const results = await prisma.result.findMany({
        where: {
          studentId: student.id,
          termId: parseInt(termId)
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

      // Calculate term average
      const termAverage = await calculateStudentTermAverage(
        prisma,
        student.id,
        parseInt(termId)
      );

      // Calculate term position
      const classResults = await prisma.result.findMany({
        where: {
          classId: parseInt(classId),
          termId: parseInt(termId)
        },
        include: {
          student: true
        }
      });

      const studentAverages = {};
      classResults.forEach(result => {
        if (!studentAverages[result.studentId]) {
          studentAverages[result.studentId] = {
            total: 0,
            count: 0
          };
        }
        studentAverages[result.studentId].total += result.totalScore;
        studentAverages[result.studentId].count += 1;
      });

      const averages = Object.entries(studentAverages).map(([id, data]) => ({
        studentId: parseInt(id),
        average: data.total / data.count
      })).sort((a, b) => b.average - a.average);

      const termPosition = averages.findIndex(a => a.studentId === student.id) + 1;
      const totalStudents = averages.length;

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
          session: term.academicSession.name
        },
        subjects: results.map(result => ({
          name: result.subject.name,
          assignment1: result.assignment1Score,
          assignment2: result.assignment2Score,
          test1: result.test1Score,
          test2: result.test2Score,
          exam: result.examScore,
          total: result.totalScore,
          grade: result.grade,
          position: result.positionInClass,
          classAverage: result.classAverage,
          remark: getRemark(result.grade)
        })),
        termAverage: termAverage,
        termPosition: termPosition,
        totalStudents: totalStudents,
        overallGrade: getGrade(termAverage),
        overallRemark: getRemark(getGrade(termAverage))
      });
    }

    res.json({
      reports,
      totalStudents: reports.length
    });
  } catch (error) {
    console.error('Error generating bulk reports:', error);
    res.status(500).json({ error: 'Failed to generate bulk reports' });
  }
});

module.exports = router;
