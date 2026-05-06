const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePackage } = require('../middleware/subscription');
const {
  predictPerformance,
  identifyAtRiskStudents,
  generateRecommendations,
  Stats
} = require('../services/analytics-ai');
const AIQueryHandler = require('../services/AIQueryHandler');

// Helper to get AI Handler for a school
async function getAIHandler(schoolId) {
  const school = await prisma.school.findUnique({
    where: { id: parseInt(schoolId) },
    select: { geminiApiKey: true, groqApiKey: true }
  });

  let geminiKey = (school?.geminiApiKey && school?.geminiApiKey !== 'NONE') ? school.geminiApiKey : null;
  let groqKey = (school?.groqApiKey && school?.groqApiKey !== 'NONE') ? school.groqApiKey : null;
  
  if (!geminiKey || !groqKey) {
    const globalSettings = await prisma.globalSettings.findFirst({
      select: { geminiApiKey: true, groqApiKey: true }
    });
    
    if (!geminiKey && globalSettings?.geminiApiKey) geminiKey = globalSettings.geminiApiKey;
    if (!groqKey && globalSettings?.groqApiKey) groqKey = globalSettings.groqApiKey;
  }

  if (!geminiKey && !groqKey) return null;
  return new AIQueryHandler({ geminiApiKey: geminiKey, groqApiKey: groqKey });
}

// Helper to check if results are published for any class in the school for a term
async function isTermPublished(schoolId, termId = null) {
  const where = {
    schoolId: parseInt(schoolId),
    isPublished: true
  };

  if (termId) {
    where.termId = parseInt(termId);
  }

  const publications = await prisma.resultPublication.findMany({
    where,
    select: { classId: true }
  });

  if (publications.length > 0) return true;

  // Fallback to legacy flag for current term if no ResultPublication records exist
  const currentTerm = await prisma.term.findFirst({
    where: { isCurrent: true, schoolId: parseInt(schoolId) }
  });

  if (currentTerm && (!termId || parseInt(termId) === currentTerm.id)) {
    const publishedClasses = await prisma.class.findMany({
      where: {
        schoolId: parseInt(schoolId),
        isResultPublished: true
      }
    });
    return publishedClasses.length > 0;
  }

  return false;
}

// =============================================
// DIAGNOSTIC ENDPOINTS
// =============================================

router.get('/debug/counts', authenticate, async (req, res) => {
  try {
    const sId = parseInt(req.schoolId);
    const [students, allClasses, subjects, results, sessions, feeStructures] = await Promise.all([
      prisma.student.count({ where: { schoolId: sId } }),
      prisma.class.findMany({ where: { schoolId: sId } }),
      prisma.subject.count({ where: { schoolId: sId } }),
      prisma.result.count({ where: { schoolId: sId } }),
      prisma.academicSession.findMany({
        where: { schoolId: sId },
        include: { terms: true }
      }),
      prisma.classFeeStructure.findMany({ where: { schoolId: sId } })
    ]);

    res.json({
      schoolId: sId,
      originalSchoolId: req.schoolId,
      type: typeof req.schoolId,
      counts: {
        students,
        totalClasses: allClasses.length,
        activeClasses: allClasses.filter(c => c.isActive).length,
        subjects,
        results,
        sessions: sessions.length,
        feeStructures: feeStructures.length
      },
      classDetails: allClasses.map(c => ({ id: c.id, name: c.name, arm: c.arm, isActive: c.isActive })),
      sessionDetails: sessions.map(s => ({
        id: s.id,
        name: s.name,
        isCurrent: s.isCurrent,
        terms: s.terms.map(t => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))
      })),
      feeStructureDetails: feeStructures.map(f => ({ id: f.id, classId: f.classId, termId: f.termId, amount: f.amount })),
      resultBreakdown: await prisma.result.groupBy({
        by: ['termId'],
        where: { schoolId: sId },
        _count: { id: true }
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SUBJECT-WISE ANALYTICS
// =============================================

// Get comprehensive subject analytics
router.get('/subject/:subjectId', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const { termId } = req.query;

    // Check publication (except for superadmin or special bypass if needed)
    if (req.user.role !== 'superadmin' && !await isTermPublished(req.schoolId, termId)) {
      return res.status(403).json({
        error: 'Results Not Published',
        message: 'Statistical insights are only available once results have been officially published.'
      });
    }

    const whereClause = {
      subjectId,
      schoolId: parseInt(req.schoolId)
    };

    if (termId) {
      whereClause.termId = parseInt(termId);
    }

    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: true
          }
        },
        term: true
      }
    });

    if (results.length === 0) {
      return res.json({ message: 'No results found for this subject' });
    }

    const scores = results.map(r => r.totalScore || 0);
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: parseInt(req.schoolId)
      }
    });

    // Calculate statistics
    const analytics = {
      subjectName: subject?.name || 'Unknown',
      totalStudents: new Set(results.map(r => r.studentId)).size,
      totalRecords: results.length,
      statistics: {
        average: Stats.mean(scores).toFixed(2),
        median: Stats.median(scores).toFixed(2),
        highest: Math.max(...scores).toFixed(2),
        lowest: Math.min(...scores).toFixed(2),
        standardDeviation: Stats.standardDeviation(scores).toFixed(2)
      },
      gradeDistribution: results.reduce((acc, r) => {
        acc[r.grade] = (acc[r.grade] || 0) + 1;
        return acc;
      }, {}),
      passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1),
      topPerformers: results
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .slice(0, 5)
        .map(r => ({
          name: r.student.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : (r.student.name || r.student.admissionNumber || 'Student'),
          class: r.student.classModel ? `${r.student.classModel.name} ${r.student.classModel.arm}` : 'N/A',
          score: r.totalScore
        })),
      weakPerformers: results
        .filter(r => r.totalScore < 50)
        .sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0))
        .slice(0, 5)
        .map(r => ({
          name: r.student.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : (r.student.name || r.student.admissionNumber || 'Student'),
          class: r.student.classModel ? `${r.student.classModel.name} ${r.student.classModel.arm}` : 'N/A',
          score: r.totalScore
        }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Subject analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subject trends over terms
router.get('/subject/:subjectId/trends', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);

    const results = await prisma.result.findMany({
      where: {
        subjectId,
        schoolId: parseInt(req.schoolId)
      },
      include: {
        term: {
          include: { academicSession: true }
        }
      }
    });

    // Group by term
    const termGroups = {};
    results.forEach(r => {
      const termKey = `${r.term.academicSession.name} - ${r.term.name}`;
      if (!termGroups[termKey]) {
        termGroups[termKey] = [];
      }
      termGroups[termKey].push(r.totalScore || 0);
    });

    const trends = Object.entries(termGroups).map(([term, scores]) => ({
      term,
      average: Stats.mean(scores).toFixed(2),
      count: scores.length,
      passRate: ((scores.filter(s => s >= 40).length / scores.length) * 100).toFixed(1)
    }));

    res.json(trends);
  } catch (error) {
    console.error('Subject trends error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare all subjects
router.get('/subject/comparison/all', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const sId = parseInt(req.schoolId);
    const { termId } = req.query;

    // Check publication
    if (req.user.role !== 'superadmin' && !await isTermPublished(sId, termId)) {
      return res.status(403).json({
        error: 'Results Not Published',
        message: 'Statistical insights are only available once results have been officially published.'
      });
    }

    console.log(`[ANALYTICS] Subject Comparison - sId: ${sId}, type: ${typeof sId}`);
    const subjects = await prisma.subject.findMany({
      where: { schoolId: sId }
    });
    console.log(`[ANALYTICS] Subjects found: ${subjects.length}`);
    const comparison = [];

    console.log(`[ANALYTICS DEBUG] Fetching subjects for schoolId: ${req.schoolId}, termId: ${termId}`);

    for (const subject of subjects) {
      const whereClause = {
        subjectId: subject.id,
        schoolId: parseInt(req.schoolId)
      };

      if (termId) {
        whereClause.termId = parseInt(termId);
      }

      const results = await prisma.result.findMany({
        where: whereClause
      });

      if (results.length > 0) {
        const scores = results.map(r => r.totalScore || 0);
        comparison.push({
          subjectId: subject.id,
          subjectName: subject.name,
          average: Stats.mean(scores).toFixed(2),
          students: results.length,
          passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1)
        });
      } else {
        comparison.push({
          subjectId: subject.id,
          subjectName: subject.name,
          average: '0.00',
          students: 0,
          passRate: '0.0'
        });
      }
    }

    res.json(comparison.sort((a, b) => b.average - a.average));
  } catch (error) {
    console.error('Subject comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// STUDENT ANALYTICS
// =============================================

// Comprehensive student analytics
router.get('/student/:studentId/comprehensive', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { subject: true, term: true },
      orderBy: { createdAt: 'desc' }
    });

    if (results.length === 0) {
      return res.json({
        student: {
          name: student.user ? `${student.user.firstName} ${student.user.lastName}` : (student.name || student.admissionNumber || 'Student'),
          class: student.classModel ? `${student.classModel.name} ${student.classModel.arm}` : 'N/A'
        },
        message: 'No results available'
      });
    }

    const scores = results.map(r => r.totalScore || 0);

    // Subject breakdown
    const subjectPerformance = {};
    results.forEach(r => {
      const subjectName = r.subject?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = [];
      }
      subjectPerformance[subjectName].push(r.totalScore || 0);
    });

    const subjectAnalysis = Object.entries(subjectPerformance).map(([subject, scores]) => ({
      subject,
      average: Stats.mean(scores).toFixed(2),
      best: Math.max(...scores),
      worst: Math.min(...scores),
      consistency: (100 - Stats.standardDeviation(scores)).toFixed(1)
    }));

    const analytics = {
      student: {
        name: student.user ? `${student.user.firstName} ${student.user.lastName}` : (student.name || student.admissionNumber || 'Student'),
        admissionNumber: student.admissionNumber,
        class: student.classModel ? `${student.classModel.name} ${student.classModel.arm}` : 'N/A'
      },
      overallPerformance: {
        currentAverage: Stats.mean(scores).toFixed(2),
        highest: Math.max(...scores),
        lowest: Math.min(...scores),
        totalSubjects: Object.keys(subjectPerformance).length,
        totalResults: results.length
      },
      subjectBreakdown: subjectAnalysis.sort((a, b) => b.average - a.average),
      strengths: subjectAnalysis.filter(s => parseFloat(s.average) >= 70).slice(0, 3),
      weaknesses: subjectAnalysis.filter(s => parseFloat(s.average) < 60).sort((a, b) => a.average - b.average).slice(0, 3),
      gradeDistribution: results.reduce((acc, r) => {
        acc[r.grade] = (acc[r.grade] || 0) + 1;
        return acc;
      }, {})
    };

    res.json(analytics);
  } catch (error) {
    console.error('Student comprehensive error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Student performance trends
router.get('/student/:studentId/trends', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { term: { include: { academicSession: true } }, subject: true },
      orderBy: { createdAt: 'asc' }
    });

    // Group by term
    const termPerformance = {};
    results.forEach(r => {
      const termKey = `${r.term.academicSession.name} - ${r.term.name}`;
      if (!termPerformance[termKey]) {
        termPerformance[termKey] = { scores: [], subjects: {} };
      }
      termPerformance[termKey].scores.push(r.totalScore || 0);
      termPerformance[termKey].subjects[r.subject?.name || 'Unknown'] = r.totalScore || 0;
    });

    const trends = Object.entries(termPerformance).map(([term, data]) => ({
      term,
      average: Stats.mean(data.scores).toFixed(2),
      subjects: data.subjects
    }));

    res.json(trends);
  } catch (error) {
    console.error('Student trends error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI predictions for student
router.get('/student/:studentId/predictions', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const prediction = await predictPerformance(prisma, studentId, req.schoolId);
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Student vs class average
router.get('/student/:studentId/peer-comparison', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { classModel: true }
    });

    if (!student || !student.classId) {
      return res.status(404).json({ error: 'Student or class not found' });
    }

    // Get student's results
    const studentResults = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: parseInt(req.schoolId)
      },
      include: { subject: true }
    });

    // Get class average
    const classStudents = await prisma.student.findMany({
      where: {
        classId: student.classId,
        schoolId: parseInt(req.schoolId)
      }
    });

    const classResults = await prisma.result.findMany({
      where: {
        studentId: { in: classStudents.map(s => s.id) },
        schoolId: parseInt(req.schoolId)
      },
      include: { subject: true }
    });

    // Compare by subject
    const comparison = {};
    studentResults.forEach(sr => {
      const subjectName = sr.subject?.name || 'Unknown';
      const classSubjectScores = classResults
        .filter(cr => cr.subjectId === sr.subjectId)
        .map(cr => cr.totalScore || 0);

      comparison[subjectName] = {
        studentScore: sr.totalScore,
        classAverage: Stats.mean(classSubjectScores).toFixed(2),
        percentile: Stats.percentile(classSubjectScores,
          (classSubjectScores.filter(s => s <= sr.totalScore).length / classSubjectScores.length) * 100
        ).toFixed(1),
        performance: sr.totalScore >= Stats.mean(classSubjectScores) ? 'Above Average' : 'Below Average'
      };
    });

    res.json(comparison);
  } catch (error) {
    console.error('Peer comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// TEACHER ANALYTICS
// =============================================

// Teacher effectiveness
router.get('/teacher/:teacherId/effectiveness', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    // Get teacher's assignments
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId,
        schoolId: parseInt(req.schoolId)
      },
      include: {
        classSubject: {
          include: {
            subject: true,
            class: true
          }
        }
      }
    });

    if (assignments.length === 0) {
      return res.json({ message: 'No assignments found for this teacher' });
    }

    const effectiveness = [];

    for (const ta of assignments) {
      const assignment = ta.classSubject;
      // Get results for this subject in this class
      const students = await prisma.student.findMany({
        where: {
          classId: assignment.classId,
          schoolId: parseInt(req.schoolId)
        }
      });

      const results = await prisma.result.findMany({
        where: {
          subjectId: assignment.subjectId,
          studentId: { in: students.map(s => s.id) },
          schoolId: parseInt(req.schoolId)
        }
      });

      if (results.length > 0) {
        const scores = results.map(r => r.totalScore || 0);
        effectiveness.push({
          subject: assignment.subject.name,
          class: `${assignment.class.name} ${assignment.class.arm}`,
          studentsCount: results.length,
          averageScore: Stats.mean(scores).toFixed(2),
          passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1),
          excellenceRate: ((results.filter(r => r.totalScore >= 70).length / results.length) * 100).toFixed(1)
        });
      }
    }

    const overallAverage = effectiveness.length > 0
      ? Stats.mean(effectiveness.map(e => parseFloat(e.averageScore))).toFixed(2)
      : 0;

    res.json({
      teacherId,
      totalAssignments: assignments.length,
      overallEffectiveness: overallAverage,
      classPerformance: effectiveness.sort((a, b) => b.averageScore - a.averageScore)
    });
  } catch (error) {
    console.error('Teacher effectiveness error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// CLASS ANALYTICS
// =============================================

// Class overview analytics
router.get('/class/:classId/overview', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: parseInt(req.schoolId)
      }
    });

    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId: parseInt(req.schoolId)
      }
    });

    const results = await prisma.result.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        schoolId: parseInt(req.schoolId)
      },
      include: { subject: true, student: { include: { user: true } } }
    });

    if (results.length === 0) {
      return res.json({
        class: `${classInfo.name} ${classInfo.arm}`,
        message: 'No results available'
      });
    }

    const scores = results.map(r => r.totalScore || 0);

    res.json({
      class: `${classInfo.name} ${classInfo.arm}`,
      totalStudents: students.length,
      statistics: {
        average: Stats.mean(scores).toFixed(2),
        median: Stats.median(scores).toFixed(2),
        highest: Math.max(...scores),
        lowest: Math.min(...scores)
      },
      passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1),
      topStudents: results
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5)
        .map(r => ({
          name: r.student.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : (r.student.name || r.student.admissionNumber || 'Student'),
          score: r.totalScore
        }))
    });
  } catch (error) {
    console.error('Class overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Class comparison
router.get('/class/comparison/all', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const sId = parseInt(req.schoolId);
    const { termId } = req.query;

    // Check publication
    if (req.user.role !== 'superadmin' && !await isTermPublished(sId, termId)) {
      return res.status(403).json({
        error: 'Results Not Published',
        message: 'Statistical insights are only available once results have been officially published.'
      });
    }

    console.log(`[ANALYTICS] Class Comparison - sId: ${sId}, type: ${typeof sId}`);
    const classes = await prisma.class.findMany({
      where: { schoolId: sId }
    });
    console.log(`[ANALYTICS] Classes found: ${classes.length}`);

    console.log(`[ANALYTICS DEBUG] Fetching classes for schoolId: ${req.schoolId}, termId: ${termId}`);
    const comparison = [];

    for (const cls of classes) {
      const students = await prisma.student.findMany({
        where: {
          classId: cls.id,
          schoolId: parseInt(req.schoolId)
        }
      });

      const whereClause = {
        studentId: { in: students.map(s => s.id) },
        schoolId: parseInt(req.schoolId)
      };

      if (termId) {
        whereClause.termId = parseInt(termId);
      }

      const results = await prisma.result.findMany({
        where: whereClause
      });

      if (results.length > 0) {
        const scores = results.map(r => r.totalScore || 0);
        comparison.push({
          classId: cls.id,
          className: `${cls.name} ${cls.arm}`,
          students: students.length,
          average: Stats.mean(scores).toFixed(2),
          passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1)
        });
      } else {
        comparison.push({
          classId: cls.id,
          className: `${cls.name} ${cls.arm}`,
          students: students.length,
          average: '0.00',
          passRate: '0.0'
        });
      }
    }

    res.json(comparison.sort((a, b) => b.average - a.average));
  } catch (error) {
    console.error('Class comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// TERM ANALYTICS
// =============================================

// Term overview
router.get('/term/:termId/overview', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const termId = parseInt(req.params.termId);

    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        schoolId: req.schoolId
      },
      include: { academicSession: true }
    });

    const results = await prisma.result.findMany({
      where: {
        termId,
        schoolId: req.schoolId
      }
    });

    const scores = results.map(r => r.totalScore || 0);

    res.json({
      term: `${term.academicSession.name} - ${term.name}`,
      totalResults: results.length,
      statistics: {
        average: Stats.mean(scores).toFixed(2),
        median: Stats.median(scores).toFixed(2),
        highest: Math.max(...scores),
        lowest: Math.min(...scores)
      },
      passRate: ((results.filter(r => r.totalScore >= 40).length / results.length) * 100).toFixed(1),
      gradeDistribution: results.reduce((acc, r) => {
        acc[r.grade] = (acc[r.grade] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Term overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Term comparison
router.get('/term/comparison', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const { term1, term2 } = req.query;

    if (!term1 || !term2) {
      return res.status(400).json({ error: 'Please provide term1 and term2 IDs' });
    }

    const results1 = await prisma.result.findMany({
      where: {
        termId: parseInt(term1),
        schoolId: req.schoolId
      }
    });
    const results2 = await prisma.result.findMany({
      where: {
        termId: parseInt(term2),
        schoolId: req.schoolId
      }
    });

    const scores1 = results1.map(r => r.totalScore || 0);
    const scores2 = results2.map(r => r.totalScore || 0);

    res.json({
      term1: {
        average: Stats.mean(scores1).toFixed(2),
        passRate: ((results1.filter(r => r.totalScore >= 40).length / results1.length) * 100).toFixed(1)
      },
      term2: {
        average: Stats.mean(scores2).toFixed(2),
        passRate: ((results2.filter(r => r.totalScore >= 40).length / results2.length) * 100).toFixed(1)
      },
      improvement: (Stats.mean(scores2) - Stats.mean(scores1)).toFixed(2)
    });
  } catch (error) {
    console.error('Term comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// AI INSIGHTS
// =============================================

// At-risk students
router.get('/ai/at-risk-students', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const { classId, termId } = req.query;

    // Check publication
    if (req.user.role !== 'superadmin' && !await isTermPublished(req.schoolId, termId)) {
      return res.status(403).json({
        error: 'Results Not Published',
        message: 'Statistical insights are only available once results have been officially published.'
      });
    }

    const atRiskStudents = await identifyAtRiskStudents(prisma, req.schoolId, classId, termId);
    res.json(atRiskStudents);
  } catch (error) {
    console.error('At-risk detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Personalized recommendations
router.get('/ai/recommendations/:studentId', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const recommendations = await generateRecommendations(prisma, studentId, req.schoolId);
    res.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Heatmap analytics
router.get('/heatmap', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const { termId } = req.query;

    // Check publication
    if (req.user.role !== 'superadmin' && !await isTermPublished(req.schoolId, termId)) {
      return res.status(403).json({
        error: 'Results Not Published',
        message: 'Statistical insights are only available once results have been officially published.'
      });
    }

    // 1. Fetch available classes and subjects for axes
    const classes = await prisma.class.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { name: 'asc' } // or custom order
    });

    const subjects = await prisma.subject.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { name: 'asc' }
    });

    if (classes.length === 0 || subjects.length === 0) {
      return res.json({ classes: [], subjects: [], heatmap: {} });
    }

    // 2. Fetch results
    const whereClause = {
      schoolId: req.schoolId
    };
    if (termId) {
      whereClause.termId = parseInt(termId);
    }

    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        subject: true,
        student: {
          select: { classId: true }
        }
      }
    });

    // 3. Aggregate data
    // Map: "classId-subjectId" -> [scores]
    const aggregation = {};

    results.forEach(r => {
      if (!r.student || !r.student.classId) return;

      const key = `${r.student.classId}-${r.subjectId}`;
      if (!aggregation[key]) {
        aggregation[key] = [];
      }
      aggregation[key].push(r.totalScore || 0);
    });

    // 4. Calculate averages
    const heatmap = {};
    Object.keys(aggregation).forEach(key => {
      heatmap[key] = {
        average: parseFloat(Stats.mean(aggregation[key]).toFixed(1)),
        count: aggregation[key].length
      };
    });

    // 5. Return structure
    res.json({
      classes: classes.map(c => ({ id: c.id, name: `${c.name} ${c.arm}` })),
      subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      data: heatmap
    });

  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deep AI Student Diagnosis
router.post('/ai/student-diagnosis/:studentId', authenticate, requirePackage('premium'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId } = req.body; // Optional term context
    
    // 1. Fetch Student Data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: true,
        attendance: { take: 10, orderBy: { date: 'desc' } },
        psychomotorRatings: { 
          where: termId ? { termId: parseInt(termId) } : {},
          include: { skill: true }
        }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // 2. Fetch Performance History
    const results = await prisma.result.findMany({
      where: { 
        studentId, 
        schoolId: parseInt(req.schoolId)
      },
      include: { subject: true, term: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // 3. Setup AI
    const aiHandler = await getAIHandler(req.schoolId);
    if (!aiHandler) return res.status(400).json({ error: 'AI not configured' });

    // 4. Construct Intelligence Context
    const performanceContext = results.map(r => ({
      subject: r.subject.name,
      score: r.totalScore,
      term: r.term.name,
      grade: r.grade
    }));

    const skillsContext = student.psychomotorRatings.map(r => ({
      skill: r.skill?.name || 'Unknown Skill',
      rating: r.rating
    }));

    const attendanceRate = student.attendance.length > 0
      ? (student.attendance.filter(a => a.status === 'present').length / student.attendance.length) * 100
      : 'N/A';

    const prompt = `Act as an Academic Intelligence Analyst for a school. Provide a deep cognitive and behavioral diagnosis and intervention roadmap for the following student:

    STUDENT IDENTITY:
    Name: ${student.user ? `${student.user.firstName} ${student.user.lastName}` : (student.name || student.admissionNumber || 'Student')}
    Class: ${student.classModel?.name || 'N/A'} ${student.classModel?.arm || ''}

    DATA INPUTS:
    Academic History (Raw): ${JSON.stringify(performanceContext)}
    Psychomotor/Soft Skills: ${JSON.stringify(skillsContext)}
    Attendance Context: ${attendanceRate}%

    TASK:
    Analyze this student across four dimensions and provide a structured report:
    1. COGNITIVE CLUSTERING: Identify subject-cluster strengths and weaknesses (e.g., STEM vs Humanities performance gap).
    2. VELOCITY & TRAJECTORY: Analyze score trends. Are they stable, volatile, or sharply declining? Detect "Silent Signals" (consistency issues).
    3. PSYCHOSOCIAL CORRELATION: Does their social skill rating correlate with academic success? (e.g., struggling in collaboration skill vs poor group project scores).
    4. STRATEGIC INTERVENTION ROADMAP: Provide a clear, 5-step Subject-Specific Recovery Plan.

    FORMAT:
    Return your response in PROFESSIONAL MARKDOWN with bold headers. The tone should be authoritative but empathetic, intended for a teacher and principal's review.`;

    const diagnosis = await aiHandler.generate(prompt);
    res.json({ diagnosis });

  } catch (error) {
    console.error('AI Diagnosis Error:', error);
    res.status(500).json({ error: 'Failed to generate diagnosis', message: error.message });
  }
});

module.exports = router;
