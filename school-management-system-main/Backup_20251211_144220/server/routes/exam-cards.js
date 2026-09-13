const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

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
      student = await prisma.student.findUnique({
        where: { userId: req.user.id },
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
      student = await prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        include: {
          user: true,
          classModel: true
        }
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check fee clearance
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!feeRecord) {
      return res.status(403).json({
        error: 'No fee record found. Please contact the school accountant.',
        requiresClearance: true
      });
    }

    if (!feeRecord.isClearedForExam) {
      return res.status(403).json({
        error: 'You have not been cleared for examination. Please ensure your school fees are paid.',
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
        studentId_termId_academicSessionId: {
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
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          cardNumber
        }
      });
    }

    // Get student's subjects for this term
    const results = await prisma.result.findMany({
      where: {
        studentId: student.id,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
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
        subjects: results.map(r => r.subject)
      }
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

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: {
        user: true,
        classModel: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const examCard = await prisma.examCard.findUnique({
      where: {
        studentId_termId_academicSessionId: {
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

    // Get student's subjects
    const results = await prisma.result.findMany({
      where: {
        studentId: student.id,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
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
      subjects: results.map(r => r.subject)
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
        studentId_termId_academicSessionId: {
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

    // Get student's subjects
    const results = await prisma.result.findMany({
      where: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
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
      subjects: results.map(r => r.subject)
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
      where: { cardNumber },
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

    const where = {};
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

module.exports = router;
