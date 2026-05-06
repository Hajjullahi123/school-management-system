const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Get all fee structures (filtered by session/term)
router.get('/', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.query;

    const where = { schoolId: parseInt(req.schoolId) };
    if (termId) where.termId = parseInt(termId);
    if (academicSessionId) where.academicSessionId = parseInt(academicSessionId);

    const structures = await prisma.classFeeStructure.findMany({
      where,
      include: {
        Class: true,
        Term: true,
        AcademicSession: true
      },
      orderBy: {
        Class: {
          name: 'asc'
        }
      }
    });

    // Map back to lowercase for frontend compatibility
    const formattedStructures = structures.map(fs => ({
      ...fs,
      class: fs.Class,
      term: fs.Term,
      academicSession: fs.AcademicSession
    }));

    res.json(formattedStructures);
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
          schoolId: parseInt(req.schoolId),
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
        schoolId: parseInt(req.schoolId),
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
        schoolId: parseInt(req.schoolId)
      }
    });

    let updatedCount = 0;
    let createdCount = 0;

    for (const student of students) {
      // Respect scholarship status
      const expectedForThisStudent = student.isScholarship ? 0 : parseFloat(amount);

      // Check if fee record exists
      const existingRecord = await prisma.feeRecord.findUnique({
        where: {
          schoolId_studentId_termId_academicSessionId: {
            schoolId: parseInt(req.schoolId),
            studentId: student.id,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId)
          }
        }
      });

      if (existingRecord) {
        // Update expected amount and balance
        // We preserve the paidAmount
        const newBalance = expectedForThisStudent - existingRecord.paidAmount;

        await prisma.feeRecord.update({
          where: { id: existingRecord.id },
          data: {
            expectedAmount: expectedForThisStudent,
            balance: newBalance
          }
        });
        updatedCount++;
      } else {
        // Create new fee record
        await prisma.feeRecord.create({
          data: {
            schoolId: parseInt(req.schoolId),
            studentId: student.id,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId),
            expectedAmount: expectedForThisStudent,
            paidAmount: 0,
            balance: expectedForThisStudent,
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
      schoolId: parseInt(req.schoolId),
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

// Delete fee structure
router.delete('/:id', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.classFeeStructure.delete({
      where: {
        id: parseInt(id),
        schoolId: parseInt(req.schoolId)
      }
    });

    res.json({ message: 'Fee structure deleted successfully' });

    // Log the action
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'DELETE',
      resource: 'FEE_STRUCTURE',
      details: { id: parseInt(id) },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    res.status(500).json({ error: 'Failed to delete fee structure' });
  }
});

module.exports = router;
