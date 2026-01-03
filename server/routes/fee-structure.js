const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all fee structures (filtered by session/term)
router.get('/', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.query;

    const where = { schoolId: req.schoolId };
    if (termId) where.termId = parseInt(termId);
    if (academicSessionId) where.academicSessionId = parseInt(academicSessionId);

    const structures = await prisma.classFeeStructure.findMany({
      where,
      include: {
        class: true,
        term: true,
        academicSession: true
      },
      orderBy: {
        class: {
          name: 'asc'
        }
      }
    });

    res.json(structures);
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    res.status(500).json({ error: 'Failed to fetch fee structures' });
  }
});

// Create or update fee structure
router.post('/setup', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { classId, termId, academicSessionId, amount, description } = req.body;

    if (!classId || !termId || !academicSessionId || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Create or Update Fee Structure
    const feeStructure = await prisma.classFeeStructure.upsert({
      where: {
        schoolId_classId_termId_academicSessionId: {
          schoolId: req.schoolId,
          classId: parseInt(classId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      update: {
        amount: parseFloat(amount),
        description
      },
      create: {
        schoolId: req.schoolId,
        classId: parseInt(classId),
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        amount: parseFloat(amount),
        description
      }
    });

    // 2. Update existing students' fee records
    // Find all students in this class
    const students = await prisma.student.findMany({
      where: {
        classId: parseInt(classId),
        schoolId: req.schoolId
      }
    });

    let updatedCount = 0;
    let createdCount = 0;

    for (const student of students) {
      // Check if fee record exists
      const existingRecord = await prisma.feeRecord.findUnique({
        where: {
          schoolId_studentId_termId_academicSessionId: {
            schoolId: req.schoolId,
            studentId: student.id,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId)
          }
        }
      });

      if (existingRecord) {
        // Update expected amount and balance
        // We preserve the paidAmount
        const newBalance = parseFloat(amount) - existingRecord.paidAmount;

        await prisma.feeRecord.update({
          where: { id: existingRecord.id },
          data: {
            expectedAmount: parseFloat(amount),
            balance: newBalance
          }
        });
        updatedCount++;
      } else {
        // Create new fee record
        await prisma.feeRecord.create({
          data: {
            schoolId: req.schoolId,
            studentId: student.id,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId),
            expectedAmount: parseFloat(amount),
            paidAmount: 0,
            balance: parseFloat(amount),
            isClearedForExam: true
          }
        });
        createdCount++;
      }
    }

    res.json({
      message: 'Fee structure saved successfully',
      feeStructure,
      stats: {
        studentsProcessed: students.length,
        recordsCreated: createdCount,
        recordsUpdated: updatedCount
      }
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPSERT',
      resource: 'FEE_STRUCTURE',
      details: {
        classId: parseInt(classId),
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        amount: parseFloat(amount),
        stats: {
          processed: students.length,
          created: createdCount,
          updated: updatedCount
        }
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Error saving fee structure:', error);
    res.status(500).json({ error: 'Failed to save fee structure' });
  }
});

module.exports = router;
