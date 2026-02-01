const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const {
  calculateTotalScore,
  getGrade,
  validateScores,
  calculateClassAverage,
  calculatePositions
} = require('../utils/grading');

// Get results for a student (Dashboard view)
router.get('/', authenticate, async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Ensure student can only view their own results
    // Admins and Principals can view any student's results
    if ((req.user.role === 'student' || req.user.role === 'parent') && req.user.role !== 'admin' && req.user.role !== 'principal') {
      let parentId = undefined;

      // If parent, find the linked Parent record to get parentId
      if (req.user.role === 'parent') {
        const parentRecord = await prisma.parent.findFirst({
          where: { userId: req.user.id }
        });
        if (!parentRecord) {
          // If a parent user exists but has no Parent record, deny access
          return res.status(403).json({ error: 'Parent record not found' });
        }
        parentId = parentRecord.id;
      }

      const student = await prisma.student.findFirst({
        where: {
          // If student, match userId. If parent, ignore userId filter (undefined).
          userId: req.user.role === 'student' ? req.user.id : undefined,
          // If parent, match parentId. If student, ignore parentId filter (undefined).
          parentId: req.user.role === 'parent' ? parentId : undefined,
          id: parseInt(studentId),
          schoolId: req.schoolId
        },
        include: { classModel: true }
      });

      if (!student) {
        return res.status(403).json({ error: 'Unauthorized Access' });
      }

      // Check if results are published for the student's current class
      if (student.classModel && !student.classModel.isResultPublished) {
        return res.status(403).json({
          error: 'Result Not Published',
          message: 'The result for this class has not been published.'
        });
      }
    }

    const results = await prisma.result.findMany({
      where: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId)
      },
      include: {
        subject: true,
        academicSession: true,
        term: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get results for a specific class, subject, and term (for teachers)
router.get('/class/:classId/subject/:subjectId/term/:termId',
  authenticate,
  authorize(['admin', 'teacher']),
  async (req, res) => {
    try {
      const { classId, subjectId, termId } = req.params;

      const results = await prisma.result.findMany({
        where: {
          schoolId: req.schoolId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          termId: parseInt(termId)
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          student: {
            user: {
              firstName: 'asc'
            }
          }
        }
      });

      res.json(results);
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ error: 'Failed to fetch results' });
    }
  });

// Create or update a single result
router.post('/entry', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const {
      studentId,
      academicSessionId,
      termId,
      classId,
      subjectId,
      assignment1Score,
      assignment2Score,
      test1Score,
      test2Score,
      examScore
    } = req.body;
    // Get school weights
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true,
        gradingSystem: true
      }
    });

    // Validate scores
    const validatedScores = validateScores(
      assignment1Score,
      assignment2Score,
      test1Score,
      test2Score,
      examScore,
      school
    );

    // Calculate total and grade
    const totalScore = calculateTotalScore(
      validatedScores.assignment1Score,
      validatedScores.assignment2Score,
      validatedScores.test1Score,
      validatedScores.test2Score,
      validatedScores.examScore
    );

    const grade = getGrade(totalScore, school.gradingSystem);

    // Fetch existing result for audit purposes
    const existingResult = await prisma.result.findUnique({
      where: {
        schoolId_studentId_subjectId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    // Upsert result
    const result = await prisma.result.upsert({
      where: {
        schoolId_studentId_subjectId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      update: {
        ...validatedScores,
        totalScore,
        grade,
        teacherId: req.user.id
      },
      create: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        academicSessionId: parseInt(academicSessionId),
        termId: parseInt(termId),
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        ...validatedScores,
        totalScore,
        grade,
        teacherId: req.user.id
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.json(result);

    // After saving, recalculate class statistics for this subject
    try {
      const avg = await calculateClassAverage(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);
      await prisma.result.updateMany({
        where: {
          schoolId: req.schoolId,
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          termId: parseInt(termId)
        },
        data: { classAverage: avg }
      });
      await calculatePositions(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);
    } catch (calcError) {
      console.error('Recalculation error:', calcError);
    }

    // Log the entry/update with detailed audit trail
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: existingResult ? 'UPDATE_SCORE' : 'CREATE_SCORE',
      resource: 'RESULT',
      details: {
        studentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId),
        previousScores: existingResult ? {
          assignment1: existingResult.assignment1Score,
          assignment2: existingResult.assignment2Score,
          test1: existingResult.test1Score,
          test2: existingResult.test2Score,
          exam: existingResult.examScore,
          total: existingResult.totalScore
        } : null,
        newScores: {
          assignment1: validatedScores.assignment1Score,
          assignment2: validatedScores.assignment2Score,
          test1: validatedScores.test1Score,
          test2: validatedScores.test2Score,
          exam: validatedScores.examScore,
          total: totalScore
        }
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(400).json({ error: error.message || 'Failed to save result' });
  }
});

// Batch entry for multiple students
router.post('/batch-entry', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const {
      academicSessionId,
      termId,
      classId,
      subjectId,
      results
    } = req.body;

    const savedResults = [];
    const errors = [];

    // Get school weights
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId },
      select: {
        assignment1Weight: true,
        assignment2Weight: true,
        test1Weight: true,
        test2Weight: true,
        examWeight: true,
        gradingSystem: true
      }
    });

    for (const resultData of results) {
      try {
        // Validate scores
        const validatedScores = validateScores(
          resultData.assignment1Score,
          resultData.assignment2Score,
          resultData.test1Score,
          resultData.test2Score,
          resultData.examScore,
          school
        );

        // Calculate total and grade
        const totalScore = calculateTotalScore(
          validatedScores.assignment1Score,
          validatedScores.assignment2Score,
          validatedScores.test1Score,
          validatedScores.test2Score,
          validatedScores.examScore
        );

        const grade = getGrade(totalScore, school.gradingSystem);

        // Upsert result
        const result = await prisma.result.upsert({
          where: {
            schoolId_studentId_subjectId_termId_academicSessionId: {
              schoolId: req.schoolId,
              studentId: parseInt(resultData.studentId),
              subjectId: parseInt(subjectId),
              termId: parseInt(termId),
              academicSessionId: parseInt(academicSessionId)
            }
          },
          update: {
            ...validatedScores,
            totalScore,
            grade,
            teacherId: req.user.id
          },
          create: {
            schoolId: req.schoolId,
            studentId: parseInt(resultData.studentId),
            academicSessionId: parseInt(academicSessionId),
            termId: parseInt(termId),
            classId: parseInt(classId),
            subjectId: parseInt(subjectId),
            ...validatedScores,
            totalScore,
            grade,
            teacherId: req.user.id
          }
        });

        savedResults.push(result);
      } catch (error) {
        errors.push({
          studentId: resultData.studentId,
          error: error.message
        });
      }
    }

    // Calculate positions and class average after batch entry (Must be school-aware? Usually classId is enough but schoolId is safer)
    await calculatePositions(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);
    const classAverage = await calculateClassAverage(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId), req.schoolId);

    // Update class average for all results
    await prisma.result.updateMany({
      where: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId)
      },
      data: {
        classAverage
      }
    });

    res.json({
      success: savedResults.length,
      errors: errors.length,
      savedResults,
      errors
    });

    // Log the batch action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BATCH_UPSERT',
      resource: 'RESULT_ENHANCED',
      details: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId),
        successCount: savedResults.length,
        errorCount: errors.length
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error in batch entry:', error);
    res.status(500).json({ error: 'Failed to process batch entry' });
  }
});

// Submit results (lock for editing)
router.post('/submit', authenticate, authorize(['admin', 'teacher', 'principal']), async (req, res) => {
  try {
    const { classId, subjectId, termId } = req.body;

    // Update all results for this class/subject/term to submitted
    const updated = await prisma.result.updateMany({
      where: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId)
      },
      data: {
        isSubmitted: true,
        submittedAt: new Date()
      }
    });

    res.json({
      message: 'Results submitted successfully',
      count: updated.count
    });

    // Log the submission
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SUBMIT_RESULTS',
      resource: 'RESULT_ENHANCED',
      details: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        termId: parseInt(termId),
        count: updated.count
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error submitting results:', error);
    res.status(500).json({ error: 'Failed to submit results' });
  }
});

module.exports = router;
