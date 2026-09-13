const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const {
  calculateTotalScore,
  getGrade,
  validateScores,
  calculateClassAverage,
  calculatePositions
} = require('../utils/grading');

// Get results for a specific class, subject, and term (for teachers)
router.get('/class/:classId/subject/:subjectId/term/:termId',
  authenticate,
  authorize(['admin', 'teacher']),
  async (req, res) => {
    try {
      const { classId, subjectId, termId } = req.params;

      const results = await prisma.result.findMany({
        where: {
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
router.post('/entry', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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

    // Validate scores
    const validatedScores = validateScores(
      assignment1Score,
      assignment2Score,
      test1Score,
      test2Score,
      examScore
    );

    // Calculate total and grade
    const totalScore = calculateTotalScore(
      validatedScores.assignment1Score,
      validatedScores.assignment2Score,
      validatedScores.test1Score,
      validatedScores.test2Score,
      validatedScores.examScore
    );

    const grade = getGrade(totalScore);

    // Upsert result
    const result = await prisma.result.upsert({
      where: {
        studentId_subjectId_termId_academicSessionId: {
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
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(400).json({ error: error.message || 'Failed to save result' });
  }
});

// Batch entry for multiple students
router.post('/batch-entry', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
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

    for (const resultData of results) {
      try {
        // Validate scores
        const validatedScores = validateScores(
          resultData.assignment1Score,
          resultData.assignment2Score,
          resultData.test1Score,
          resultData.test2Score,
          resultData.examScore
        );

        // Calculate total and grade
        const totalScore = calculateTotalScore(
          validatedScores.assignment1Score,
          validatedScores.assignment2Score,
          validatedScores.test1Score,
          validatedScores.test2Score,
          validatedScores.examScore
        );

        const grade = getGrade(totalScore);

        // Upsert result
        const result = await prisma.result.upsert({
          where: {
            studentId_subjectId_termId_academicSessionId: {
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

    // Calculate positions and class average after batch entry
    await calculatePositions(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId));
    const classAverage = await calculateClassAverage(prisma, parseInt(classId), parseInt(subjectId), parseInt(termId));

    // Update class average for all results
    await prisma.result.updateMany({
      where: {
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
  } catch (error) {
    console.error('Error in batch entry:', error);
    res.status(500).json({ error: 'Failed to process batch entry' });
  }
});

// Submit results (lock for editing)
router.post('/submit', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { classId, subjectId, termId } = req.body;

    // Update all results for this class/subject/term to submitted
    const updated = await prisma.result.updateMany({
      where: {
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
  } catch (error) {
    console.error('Error submitting results:', error);
    res.status(500).json({ error: 'Failed to submit results' });
  }
});

module.exports = router;
