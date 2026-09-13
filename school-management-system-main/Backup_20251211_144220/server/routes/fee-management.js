const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all students with fee status (Accountant/Admin)
router.get('/students', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, classId } = req.query;

    const where = {};
    if (classId) where.classId = parseInt(classId);

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classModel: true,
        feeRecords: {
          where: {
            ...(termId && { termId: parseInt(termId) }),
            ...(academicSessionId && { academicSessionId: parseInt(academicSessionId) })
          }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students with fees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get fee record for a specific student
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        student: {
          include: {
            user: true,
            classModel: true
          }
        },
        clearedByUser: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(feeRecord);
  } catch (error) {
    console.error('Error fetching fee record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update fee record (Accountant/Admin)
router.post('/record', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const {
      studentId,
      termId,
      academicSessionId,
      expectedAmount,
      paidAmount
    } = req.body;

    if (!studentId || !termId || !academicSessionId || expectedAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const balance = expectedAmount - (paidAmount || 0);

    // Check if record exists
    const existing = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    let feeRecord;

    if (existing) {
      // Update existing record
      feeRecord = await prisma.feeRecord.update({
        where: { id: existing.id },
        data: {
          expectedAmount: parseFloat(expectedAmount),
          paidAmount: parseFloat(paidAmount || 0),
          balance
        },
        include: {
          student: {
            include: {
              user: true
            }
          }
        }
      });
    } else {
      // Create new record
      feeRecord = await prisma.feeRecord.create({
        data: {
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount: parseFloat(expectedAmount),
          paidAmount: parseFloat(paidAmount || 0),
          balance
        },
        include: {
          student: {
            include: {
              user: true
            }
          }
        }
      });
    }

    res.json({
      message: existing ? 'Fee record updated' : 'Fee record created',
      feeRecord
    });
  } catch (error) {
    console.error('Error creating/updating fee record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record payment (Accountant/Admin)
router.post('/payment', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { studentId, termId, academicSessionId, amount, paymentMethod, reference, notes } = req.body;

    if (!studentId || !termId || !academicSessionId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get existing fee record
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!feeRecord) {
      return res.status(404).json({ error: 'Fee record not found. Please create a fee record first.' });
    }

    const newPaidAmount = feeRecord.paidAmount + parseFloat(amount);
    const newBalance = feeRecord.expectedAmount - newPaidAmount;

    // Use transaction to update fee record and create payment history
    const result = await prisma.$transaction(async (tx) => {
      // Update fee record
      const updated = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance
        },
        include: {
          student: {
            include: {
              user: true
            }
          }
        }
      });

      // Create payment history record
      const payment = await tx.feePayment.create({
        data: {
          feeRecordId: feeRecord.id,
          amount: parseFloat(amount),
          paymentMethod: paymentMethod || 'cash',
          reference: reference || null,
          notes: notes || null,
          recordedBy: req.user.id,
          paymentDate: new Date()
        }
      });

      return { feeRecord: updated, payment };
    });

    res.json({
      message: 'Payment recorded successfully',
      feeRecord: result.feeRecord,
      payment: result.payment
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit payment (Accountant/Admin)
router.put('/payment/:paymentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { amount, paymentMethod, reference, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Get existing payment
    const payment = await prisma.feePayment.findUnique({
      where: { id: paymentId },
      include: {
        feeRecord: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Calculate difference
    const oldAmount = payment.amount;
    const newAmount = parseFloat(amount);
    const difference = newAmount - oldAmount;

    const result = await prisma.$transaction(async (tx) => {
      // Update fee record balance
      const feeRecord = await tx.feeRecord.findUnique({
        where: { id: payment.feeRecordId }
      });

      const newPaidAmount = feeRecord.paidAmount + difference;
      const newBalance = feeRecord.expectedAmount - newPaidAmount;

      const updatedFeeRecord = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          // Re-evaluate clearance if necessary
          isClearedForExam: newBalance <= 0
        },
        include: {
          student: {
            include: {
              user: true
            }
          }
        }
      });

      // Update payment record
      const updatedPayment = await tx.feePayment.update({
        where: { id: paymentId },
        data: {
          amount: newAmount,
          paymentMethod: paymentMethod || payment.paymentMethod,
          reference: reference || payment.reference,
          notes: notes || payment.notes
        }
      });

      return { feeRecord: updatedFeeRecord, payment: updatedPayment };
    });

    res.json({
      message: 'Payment updated successfully',
      feeRecord: result.feeRecord,
      payment: result.payment
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for a student
router.get('/payments/:studentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Get fee record
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!feeRecord) {
      return res.json([]); // Return empty array if no fee record exists
    }

    // Get payment history
    const payments = await prisma.feePayment.findMany({
      where: {
        feeRecordId: feeRecord.id
      },
      include: {
        recordedByUser: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message });
  }
});


// Clear student for exam (Accountant/Admin)
router.post('/clear/:studentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Get fee record
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!feeRecord) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    // Clear student
    const updated = await prisma.feeRecord.update({
      where: { id: feeRecord.id },
      data: {
        isClearedForExam: true,
        clearedBy: req.user.id,
        clearedAt: new Date()
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        clearedByUser: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: 'Student cleared for examination',
      feeRecord: updated
    });
  } catch (error) {
    console.error('Error clearing student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke exam clearance (Admin only)
router.post('/revoke-clearance/:studentId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        studentId_termId_academicSessionId: {
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (!feeRecord) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    const updated = await prisma.feeRecord.update({
      where: { id: feeRecord.id },
      data: {
        isClearedForExam: false,
        clearedBy: null,
        clearedAt: null
      }
    });

    res.json({
      message: 'Exam clearance revoked',
      feeRecord: updated
    });
  } catch (error) {
    console.error('Error revoking clearance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get fee summary/statistics (Accountant/Admin)
router.get('/summary', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    const feeRecords = await prisma.feeRecord.findMany({
      where: {
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
      }
    });

    const summary = {
      totalStudents: feeRecords.length,
      totalExpected: feeRecords.reduce((sum, record) => sum + record.expectedAmount, 0),
      totalPaid: feeRecords.reduce((sum, record) => sum + record.paidAmount, 0),
      totalBalance: feeRecords.reduce((sum, record) => sum + record.balance, 0),
      clearedStudents: feeRecords.filter(r => r.isClearedForExam).length,
      unclearedStudents: feeRecords.filter(r => !r.isClearedForExam).length,
      fullyPaid: feeRecords.filter(r => r.balance <= 0).length,
      partiallyPaid: feeRecords.filter(r => r.paidAmount > 0 && r.balance > 0).length,
      notPaid: feeRecords.filter(r => r.paidAmount === 0).length
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching fee summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
