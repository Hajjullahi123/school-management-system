const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Generate exam card (Student, Admin, Accountant)
router.post('/generate', authenticate, authorize(['student', 'admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, studentId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    let student;

    // Determine which student to generate for
    if (req.user.role === 'student') {
      student = await prisma.student.findFirst({
        where: {
          userId: req.user.id,
          schoolId: req.schoolId
        },
        include: {
          user: true,
          classModel: true
        }
      });
    } else {
      // Admin/Accountant must provide studentId
      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required for admin/accountant' });
      }
      student = await prisma.student.findFirst({
        where: {
          id: parseInt(studentId),
          schoolId: req.schoolId
        },
        include: {
          user: true,
          classModel: true
        }
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    if (student.isExamRestricted) {
      return res.status(403).json({
        error: 'ACCESS DENIED: You have been restricted from accessing exam cards.',
        restrictionReason: student.examRestrictionReason || 'Please contact school administration.'
      });
    }

    // Check fee clearance - Default to allowed if no record exists
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    // If restricted, block generation
    if (feeRecord && !feeRecord.isClearedForExam) {
      return res.status(403).json({
        error: 'Your exam card access has been restricted by the school administration. Please resolve any outstanding issues with the accountant.',
        requiresClearance: true,
        feeStatus: {
          expected: feeRecord.expectedAmount,
          paid: feeRecord.paidAmount,
          balance: feeRecord.balance
        }
      });
    }

    // Check if exam card already exists
    let examCard = await prisma.examCard.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!examCard) {
      // Generate unique card number
      const cardNumber = `EC-${new Date().getFullYear()}-${student.admissionNumber}-${Date.now()}`;

      examCard = await prisma.examCard.create({
        data: {
          schoolId: req.schoolId,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          cardNumber
        }
      });
    }

    // Get ALL subjects assigned to student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: student.classId,
        schoolId: req.schoolId
      },
      include: {
        subject: true
      }
    });

    res.json({
      message: 'Exam card generated successfully',
      examCard: {
        ...examCard,
        student: {
          admissionNumber: student.admissionNumber,
          name: `${student.user.firstName} ${student.user.lastName}`,
          class: student.classModel ? `${student.classModel.name}${student.classModel.arm ? ' ' + student.classModel.arm : ''}` : 'N/A',
          photoUrl: student.photoUrl
        },
        subjects: classSubjects.map(cs => cs.subject)
      }
    });

    // Log the generation
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'GENERATE',
      resource: 'EXAM_CARD',
      details: {
        studentId: student.id,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        cardNumber: examCard.cardNumber
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error generating exam card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student's exam card
router.get('/my-card', authenticate, authorize(['student']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const student = await prisma.student.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: {
        user: true,
        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    if (student.isExamRestricted) {
      return res.status(403).json({
        error: 'ACCESS DENIED: You have been restricted from accessing exam cards.',
        restrictionReason: student.examRestrictionReason || 'Please contact school administration.'
      });
    }

    const examCard = await prisma.examCard.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        academicSession: true,
        term: true
      }
    });

    if (!examCard) {
      return res.status(404).json({ error: 'Exam card not found. Please generate your exam card first.' });
    }

    // Get ALL subjects assigned to student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: student.classId,
        schoolId: req.schoolId
      },
      include: {
        subject: true
      }
    });

    res.json({
      ...examCard,
      student: {
        admissionNumber: student.admissionNumber,
        name: `${student.user.firstName} ${student.user.lastName}`,
        class: student.classModel ? `${student.classModel.name}${student.classModel.arm ? ' ' + student.classModel.arm : ''}` : 'N/A',
        photoUrl: student.photoUrl
      },
      subjects: classSubjects.map(cs => cs.subject)
    });
  } catch (error) {
    console.error('Error fetching exam card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student's exam card (Admin/Accountant view)
router.get('/student/:studentId', authenticate, authorize(['admin', 'accountant', 'teacher']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    const examCard = await prisma.examCard.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        academicSession: true,
        term: true,
        student: {
          include: {
            user: true,
            classModel: true
          }
        }
      }
    });

    if (!examCard) {
      return res.status(404).json({ error: 'Exam card not found for this student.' });
    }

    // Get ALL subjects assigned to student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: examCard.student.classId,
        schoolId: req.schoolId
      },
      include: {
        subject: true
      }
    });

    res.json({
      ...examCard,
      student: {
        admissionNumber: examCard.student.admissionNumber,
        name: `${examCard.student.user.firstName} ${examCard.student.user.lastName}`,
        class: examCard.student.classModel ? `${examCard.student.classModel.name}${examCard.student.classModel.arm ? ' ' + examCard.student.classModel.arm : ''}` : 'N/A',
        photoUrl: examCard.student.photoUrl
      },
      subjects: classSubjects.map(cs => cs.subject)
    });
  } catch (error) {
    console.error('Error fetching student exam card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify exam card (Admin/Teacher)
router.get('/verify/:cardNumber', authenticate, authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { cardNumber } = req.params;

    const examCard = await prisma.examCard.findUnique({
      where: {
        schoolId_cardNumber: {
          schoolId: req.schoolId,
          cardNumber
        }
      },
      include: {
        student: {
          include: {
            user: true,
            classModel: true
          }
        },
        academicSession: true,
        term: true
      }
    });

    if (!examCard) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid exam card number'
      });
    }

    res.json({
      valid: true,
      examCard: {
        cardNumber: examCard.cardNumber,
        issuedAt: examCard.issuedAt,
        student: {
          admissionNumber: examCard.student.admissionNumber,
          name: `${examCard.student.user.firstName} ${examCard.student.user.lastName}`,
          class: examCard.student.classModel ?
            `${examCard.student.classModel.name}${examCard.student.classModel.arm ? ' ' + examCard.student.classModel.arm : ''}` :
            'N/A',
          photoUrl: examCard.student.photoUrl
        },
        session: examCard.academicSession.name,
        term: examCard.term.name
      }
    });
  } catch (error) {
    console.error('Error verifying exam card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all exam cards (Admin)
router.get('/all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.query;

    const where = { schoolId: req.schoolId };
    if (termId) where.termId = parseInt(termId);
    if (academicSessionId) where.academicSessionId = parseInt(academicSessionId);

    const examCards = await prisma.examCard.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            classModel: true
          }
        },
        academicSession: true,
        term: true
      },
      orderBy: { issuedAt: 'desc' }
    });

    res.json(examCards);
  } catch (error) {
    console.error('Error fetching exam cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk generate exam cards for all cleared students
router.post('/bulk-generate', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, classId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term and Session are required' });
    }

    // Find all cleared students
    const where = {
      schoolId: req.schoolId,
      termId: parseInt(termId),
      academicSessionId: parseInt(academicSessionId),
      isClearedForExam: true
    };

    if (classId) {
      where.student = { classId: parseInt(classId) };
    }

    const clearedRecords = await prisma.feeRecord.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            classModel: true
          }
        }
      }
    });

    if (clearedRecords.length === 0) {
      return res.status(400).json({ error: 'No cleared students found' });
    }

    const results = {
      generated: [],
      alreadyExists: [],
      errors: []
    };

    for (const record of clearedRecords) {
      try {
        // Check if card exists
        const existing = await prisma.examCard.findUnique({
          where: {
            schoolId_studentId_termId_academicSessionId: {
              schoolId: req.schoolId,
              studentId: record.studentId,
              termId: parseInt(termId),
              academicSessionId: parseInt(academicSessionId)
            }
          }
        });

        if (existing) {
          results.alreadyExists.push({
            studentId: record.studentId,
            name: `${record.student.user.firstName} ${record.student.user.lastName}`,
            cardNumber: existing.cardNumber
          });
          continue;
        }

        // Generate card
        const cardNumber = `EC-${new Date().getFullYear()}-${record.student.admissionNumber}-${Date.now() + record.studentId}`;

        const card = await prisma.examCard.create({
          data: {
            schoolId: req.schoolId,
            studentId: record.studentId,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId),
            cardNumber
          }
        });

        results.generated.push({
          studentId: record.studentId,
          name: `${record.student.user.firstName} ${record.student.user.lastName}`,
          cardNumber: card.cardNumber
        });

      } catch (error) {
        results.errors.push({
          studentId: record.studentId,
          name: `${record.student.user.firstName} ${record.student.user.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      message: `Generated: ${results.generated.length}, Existed: ${results.alreadyExists.length}, Errors: ${results.errors.length}`,
      results
    });

    // Log the bulk action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_GENERATE',
      resource: 'EXAM_CARD',
      details: {
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        classId: classId ? parseInt(classId) : 'all',
        count: results.generated.length
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Bulk generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
router.get('/stats/:termId/:sessionId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const termId = parseInt(req.params.termId);
    const sessionId = parseInt(req.params.sessionId);

    const clearedCount = await prisma.feeRecord.count({
      where: {
        schoolId: req.schoolId,
        termId,
        academicSessionId: sessionId,
        isClearedForExam: true
      }
    });

    const issuedCount = await prisma.examCard.count({
      where: {
        schoolId: req.schoolId,
        termId,
        academicSessionId: sessionId
      }
    });

    res.json({
      clearedStudents: clearedCount,
      issuedCards: issuedCount,
      pendingCards: Math.max(0, clearedCount - issuedCount)
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
