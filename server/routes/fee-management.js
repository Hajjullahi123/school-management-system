const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendPaymentConfirmation } = require('../services/emailService');
const { logAction } = require('../utils/audit');
const { getStudentFeeSummary, calculatePreviousOutstanding, createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');

// Get all students with fee status (Accountant/Admin)
router.get('/students', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, classId } = req.query;

    const where = { schoolId: req.schoolId, status: 'active' };
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

    // Fetch fee structures to populate expected amounts for students without records
    const feeStructures = await prisma.classFeeStructure.findMany({
      where: {
        schoolId: req.schoolId,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
      }
    });

    const structureMap = {};
    feeStructures.forEach(fs => {
      structureMap[fs.classId] = fs.amount;
    });

    // Populate missing records with virtual data for display
    const processedStudents = students.map(student => {
      // If student has records, return as is (but check for consistency if needed)
      // If no records, create a virtual one based on structure
      if (!student.feeRecords || student.feeRecords.length === 0) {
        const expected = student.isScholarship ? 0 : (structureMap[student.classId] || 0);

        // We attach a virtual record so frontend displays correct 'Expected' and 'Balance'
        // We use a dummy ID or null, frontend actions usually use studentId + termId
        student.feeRecords = [{
          id: null,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount: expected,
          paidAmount: 0,
          balance: expected,
          isClearedForExam: false // Default to restricted
        }];
      }
      return student;
    });

    res.json(processedStudents);
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
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
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

// Get comprehensive fee summary with opening balance
router.get('/student/:studentId/summary', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Get comprehensive summary
    const summary = await getStudentFeeSummary(
      req.schoolId,
      studentId,
      parseInt(academicSessionId),
      parseInt(termId)
    );

    if (!summary) {
      return res.status(404).json({ error: 'Unable to fetch fee summary' });
    }

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        classModel: true
      }
    });

    res.json({
      student,
      ...summary
    });
  } catch (error) {
    console.error('Error fetching fee summary:', error);
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

    // Check if student is on scholarship
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: { isScholarship: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Override expected amount to 0 for scholarship students
    const finalExpectedAmount = student.isScholarship ? 0 : parseFloat(expectedAmount);
    const balance = finalExpectedAmount - (paidAmount || 0);

    // Check if record exists
    const existing = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
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
        where: {
          id: existing.id,
          schoolId: req.schoolId
        },
        data: {
          expectedAmount: finalExpectedAmount,
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
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount: finalExpectedAmount,
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
      feeRecord,
      ...(student.isScholarship && {
        warning: 'This student is on scholarship. Fee amount has been automatically set to ₦0.'
      })
    });

    // Log the action
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: existing ? 'UPDATE' : 'CREATE',
      resource: 'FEE_RECORD',
      details: {
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        expectedAmount,
        paidAmount
      },
      ipAddress: req.ip
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

    // Get existing fee record with student, parent, term, and session info
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        student: {
          include: {
            user: true,
            parent: {
              include: {
                user: true
              }
            },
            classModel: true
          }
        },
        term: true,
        academicSession: true
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
        where: {
          id: feeRecord.id,
          schoolId: req.schoolId
        },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance
        },
        include: {
          student: {
            include: {
              user: true,
              parent: {
                include: {
                  user: true
                }
              },
              classModel: true
            }
          },
          term: true,
          academicSession: true
        }
      });

      // Create payment history record
      const payment = await tx.feePayment.create({
        data: {
          schoolId: req.schoolId,
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

    // Send payment confirmation email to parent (non-blocking)
    if (result.feeRecord.student.parent?.user?.email) {
      const emailData = {
        parentEmail: result.feeRecord.student.parent.user.email,
        studentName: `${result.feeRecord.student.user.firstName} ${result.feeRecord.student.user.lastName}`,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'Cash',
        date: new Date(),
        receiptNumber: result.payment.id,
        balance: newBalance,
        termName: result.feeRecord.term?.name || 'Current Term',
        sessionName: result.feeRecord.academicSession?.name || 'Current Session',
        schoolName: process.env.SCHOOL_NAME || 'School Management System',
        className: result.feeRecord.student.classModel?.name || 'N/A'
      };

      // Send email asynchronously (don't await to avoid blocking)
      sendPaymentConfirmation(emailData).catch(e => console.error('Payment email error:', e));
    }

    // NEW: Send SMS confirmation (non-blocking)
    if (result.feeRecord.student.parent?.phoneNumber) {
      const { sendPaymentSMS } = require('../services/smsService');
      const settings = await prisma.school.findUnique({
        where: { id: req.schoolId }
      });
      const schoolName = settings?.name || settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

      sendPaymentSMS({
        phone: result.feeRecord.student.parent.phoneNumber,
        studentName: `${result.feeRecord.student.user.firstName} ${result.feeRecord.student.user.lastName}`,
        amount: parseFloat(amount),
        balance: newBalance,
        schoolName
      }).catch(e => console.error('Payment SMS error:', e));
    }

    res.json({
      message: 'Payment recorded successfully',
      feeRecord: result.feeRecord,
      payment: result.payment,
      emailSent: !!result.feeRecord.student.parent?.user?.email
    });

    // Log the payment
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'FEE_PAYMENT',
      details: {
        paymentId: result.payment.id,
        feeRecordId: result.feeRecord.id,
        studentId: parseInt(studentId),
        amount,
        paymentMethod,
        reference
      },
      ipAddress: req.ip
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
    const payment = await prisma.feePayment.findFirst({
      where: {
        id: paymentId,
        schoolId: req.schoolId
      },
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
      const feeRecord = await tx.feeRecord.findFirst({
        where: {
          id: payment.feeRecordId,
          schoolId: req.schoolId
        }
      });

      const newPaidAmount = feeRecord.paidAmount + difference;
      const newBalance = feeRecord.expectedAmount - newPaidAmount;

      const updatedFeeRecord = await tx.feeRecord.update({
        where: {
          id: feeRecord.id,
          schoolId: req.schoolId
        },
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

      // Update payment record
      const updatedPayment = await tx.feePayment.update({
        where: {
          id: paymentId,
          schoolId: req.schoolId
        },
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

    // Log the update
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'FEE_PAYMENT',
      details: {
        paymentId,
        oldAmount,
        newAmount,
        difference
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for a student
router.get('/payments/:studentId', authenticate, authorize(['admin', 'accountant', 'student']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.query;

    if (req.user.role === 'student') {
      // Find the student record associated with this user
      const student = await prisma.student.findFirst({
        where: {
          userId: req.user.id,
          schoolId: req.schoolId
        }
      });

      if (!student || student.id !== studentId) {
        return res.status(403).json({ error: 'You are not authorized to view this payment history.' });
      }
    }

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Get fee record
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
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
        feeRecordId: feeRecord.id,
        schoolId: req.schoolId
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


// Consolidate clearance logic into a single toggle for easier management
router.post('/toggle-clearance/:studentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    // Get fee record
    let feeRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    let updatedStatus;
    if (!feeRecord) {
      // If no fee record exists, we create one.
      // The toggle implies changing from a default state.
      // If the system default is 'allowed' (true), then toggling it when it doesn't exist means we are setting it to 'restricted' (false).
      // Find class fee structure to get expected amount
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isScholarship: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: {
          classId: student.classId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      });

      // Scholarship students get 0 fees
      const expectedAmount = student.isScholarship ? 0 : (feeStructure?.amount || 0);

      feeRecord = await prisma.feeRecord.create({
        data: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount,
          paidAmount: 0,
          balance: expectedAmount,
          isClearedForExam: false // Toggled from default allowed (true) to restricted (false)
        }
      });
      updatedStatus = false; // Since we just created it as restricted
    } else {
      updatedStatus = !feeRecord.isClearedForExam;
      await prisma.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          isClearedForExam: updatedStatus,
          clearedBy: updatedStatus ? req.user.id : null,
          clearedAt: updatedStatus ? new Date() : null
        }
      });
    }

    res.json({
      message: `Student exam access ${updatedStatus ? 'allowed' : 'restricted'}`,
      isClearedForExam: updatedStatus
    });

    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'FEE_CLEARANCE',
      details: {
        studentId,
        termId: parseInt(termId),
        status: updatedStatus ? 'ALLOWED' : 'RESTRICTED'
      },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Consolidated clearance logic into toggle-clearance above. 
// Clear/Revoke routes have been simplified below for compatibility.

router.post('/clear/:studentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;
    // Use updateMany to handle missing record gracefully or upsert would be better but we need student class info
    // For simplicity, we check if exists, then update or create
    const record = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (record) {
      await prisma.feeRecord.update({
        where: { id: record.id },
        data: { isClearedForExam: true, clearedBy: req.user.id, clearedAt: new Date() }
      });
    } else {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isScholarship: true }
      });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: { classId: student?.classId, termId: parseInt(termId), academicSessionId: parseInt(academicSessionId) }
      });

      // Scholarship students get 0 fees
      const expectedAmount = student.isScholarship ? 0 : (feeStructure?.amount || 0);

      await prisma.feeRecord.create({
        data: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount,
          paidAmount: 0,
          balance: expectedAmount,
          isClearedForExam: true,
          clearedBy: req.user.id,
          clearedAt: new Date()
        }
      });
    }
    res.json({ message: 'Exam access allowed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/revoke-clearance/:studentId', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;
    // Use updateMany for simplicity if record exists
    const record = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      }
    });

    if (record) {
      await prisma.feeRecord.update({
        where: { id: record.id },
        data: { isClearedForExam: false, clearedBy: null, clearedAt: null }
      });
    } else {
      // If no record exists, we create one to store the restriction.
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isScholarship: true }
      });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: { classId: student?.classId, termId: parseInt(termId), academicSessionId: parseInt(academicSessionId) }
      });

      // Scholarship students get 0 fees
      const expectedAmount = student.isScholarship ? 0 : (feeStructure?.amount || 0);

      await prisma.feeRecord.create({
        data: {
          schoolId: req.schoolId,
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount,
          paidAmount: 0,
          balance: expectedAmount,
          isClearedForExam: false
        }
      });
    }
    res.json({ message: 'Exam access restricted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
        schoolId: req.schoolId,
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
      restrictedStudents: feeRecords.filter(r => !r.isClearedForExam).length,
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

// Bulk send fee reminders
router.post('/bulk-reminder', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, classId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term and Session are required' });
    }

    const where = {
      schoolId: req.schoolId,
      termId: parseInt(termId),
      academicSessionId: parseInt(academicSessionId),
      balance: { gt: 0 }
    };

    if (classId) {
      where.student = { classId: parseInt(classId) };
    }

    const debtors = await prisma.feeRecord.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            parent: { include: { user: { select: { email: true } } } },
            classModel: { select: { name: true, arm: true } }
          }
        },
        term: { select: { name: true } },
        academicSession: { select: { name: true } }
      }
    });

    if (debtors.length === 0) {
      return res.json({ message: 'No students found with outstanding balances', sentCount: 0 });
    }

    const { sendFeeReminder } = require('../services/emailService');
    const settings = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });
    const schoolName = settings?.name || settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

    let sentCount = 0;
    for (const record of debtors) {
      if (record.student.parent?.user?.email) {
        const reminderData = {
          parentEmail: record.student.parent.user.email,
          studentName: `${record.student.user.firstName} ${record.student.user.lastName}`,
          balance: record.balance,
          termName: record.term.name,
          sessionName: record.academicSession.name,
          className: `${record.student.classModel?.name} ${record.student.classModel?.arm || ''}`.trim(),
          schoolName
        };

        // Send asynchronously
        sendFeeReminder(reminderData).catch(e => console.error(`Reminder failed for ${record.student.id}:`, e));
        sentCount++;
      }
    }

    res.json({
      message: `Reminders are being sent to ${sentCount} parents`,
      sentCount
    });
  } catch (error) {
    console.error('Bulk reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync missing fee records for all active students (Admin/Accountant)
router.post('/sync-records', authenticate, authorize(['admin', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId } = req.body;
    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term and Session are required for sync' });
    }

    const schoolIdInt = parseInt(req.schoolId);

    // 1. Get all active students in the school
    const students = await prisma.student.findMany({
      where: { schoolId: schoolIdInt, status: 'active' }
    });

    // 2. Get all fee structures for this school/term/session
    const feeStructures = await prisma.classFeeStructure.findMany({
      where: {
        schoolId: schoolIdInt,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId)
      }
    });

    const structureMap = {};
    feeStructures.forEach(fs => {
      structureMap[fs.classId] = fs.amount;
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 3. For each student, check if record exists, if not create/update it
    for (const student of students) {
      try {
        const stAmount = student.isScholarship ? 0 : (structureMap[student.classId] || 0);

        // Check if record exists just to track counts
        const existing = await prisma.feeRecord.findUnique({
          where: {
            schoolId_studentId_termId_academicSessionId: {
              schoolId: schoolIdInt,
              studentId: student.id,
              termId: parseInt(termId),
              academicSessionId: parseInt(academicSessionId)
            }
          }
        });

        // Use the utility function to handle opening balances correctly
        // This function will create if missing, or update if existing
        await createOrUpdateFeeRecordWithOpening({
          schoolId: schoolIdInt,
          studentId: student.id,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId),
          expectedAmount: stAmount,
          paidAmount: existing ? existing.paidAmount : 0
        });

        if (!existing) {
          createdCount++;
        } else {
          updatedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync student ${student.id}:`, err);
        skippedCount++;
      }
    }

    const result = {
      message: `Sync completed: ${createdCount} records created, ${updatedCount} records updated, ${skippedCount} failed/skipped.`,
      createdCount,
      updatedCount,
      skippedCount
    };

    res.json(result);

    logAction({
      schoolId: schoolIdInt,
      userId: req.user.id,
      action: 'SYNC_FEE_RECORDS',
      resource: 'FEE_MANAGEMENT',
      details: { termId, academicSessionId, ...result },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Sync fee records error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
