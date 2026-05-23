const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendPaymentConfirmation } = require('../services/emailService');
const { logAction } = require('../utils/audit');
const { getStudentFeeSummary, calculatePreviousOutstanding, createOrUpdateFeeRecordWithOpening } = require('../utils/feeCalculations');

// Get all students with fee status (Accountant/Admin)
router.get('/students', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const { academicSessionId, termId, classId, ignoreJoinDate } = req.query;
    const schoolIdInt = parseInt(req.schoolId);
    const sessionInt = parseInt(academicSessionId);
    const termInt = parseInt(termId);
    const classInt = classId ? parseInt(classId) : null;
    const shouldIgnoreJoinDate = ignoreJoinDate === 'true';

    if (!sessionInt || !termInt) {
      // If we don't have IDs, we cannot proceed with fee calculation
      return res.json([]);
    }

    // Fetch the target term to check its dates for mid-session joiners
    const targetTerm = await prisma.term.findUnique({
      where: { id: termInt }
    });

    // Determine if we're looking at the current session/term
    const currentSession = await prisma.academicSession.findFirst({
        where: { schoolId: schoolIdInt, isCurrent: true }
      });
      const currentTerm = await prisma.term.findFirst({
        where: { schoolId: schoolIdInt, isCurrent: true }
      });

      const isCurrentPeriod = (sessionInt === currentSession?.id) && (termInt === currentTerm?.id);

      const feeRecordFilter = {
        termId: termInt,
        academicSessionId: sessionInt
      };

      let students;

      if (isCurrentPeriod) {
        // Current period: show only active students (original behavior)
        const where = { schoolId: schoolIdInt, status: 'active' };
        if (classId) where.classId = parseInt(classId);

        students = await prisma.student.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            classModel: true,
            FeeRecord: { where: feeRecordFilter }
          },
          orderBy: { admissionNumber: 'asc' }
        });

        // Map FeeRecord to feeRecords for frontend
        students = students.map(s => ({
          ...s,
          feeRecords: s.FeeRecord
        }));
      } else {
        // Historical period: show ALL students who have fee records for this term/session,
        // regardless of their current status (they may have been promoted/graduated)
        const activeWhere = { schoolId: schoolIdInt, status: 'active' };
        if (classInt) activeWhere.classId = classInt;

        const historicalWhere = {
          schoolId: schoolIdInt,
          FeeRecord: { some: feeRecordFilter }
        };
        if (classInt) historicalWhere.classId = classInt;

        students = await prisma.student.findMany({
          where: { OR: [activeWhere, historicalWhere] },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            classModel: true,
            FeeRecord: { where: feeRecordFilter }
          },
          orderBy: { admissionNumber: 'asc' }
        });

        // Map FeeRecord to feeRecords for frontend
        students = students.map(s => ({
          ...s,
          feeRecords: s.FeeRecord
        }));
      }

      // Fetch fee structures to populate expected amounts for students without records
      const feeStructures = await prisma.classFeeStructure.findMany({
        where: {
          schoolId: schoolIdInt,
          termId: termInt,
          academicSessionId: sessionInt
        }
      });

    const structureMap = {};
    feeStructures.forEach(fs => {
      structureMap[fs.classId] = fs.amount;
    });

    // Populate missing records with virtual data for display
    // IMPORTANT: We also calculate previous outstanding for everyone to show true arrears
    const processedStudents = await Promise.all(students.map(async (student) => {
      // If student has records, we use the first one (most recent for this term)
      if (student.feeRecords && student.feeRecords.length > 0) {
        return student;
      }

      // No record for current term, calculate virtual data
      // Check if student joined after this term ended (mid-session joiner)
      const joinedAfterTerm = !shouldIgnoreJoinDate && targetTerm && student.createdAt > targetTerm.endDate;
      const expected = (student.isScholarship || joinedAfterTerm) ? 0 : Math.max(0, (structureMap[student.classId] || 0) - (student.feeDiscount || 0));
      const arrears = await calculatePreviousOutstanding(
        req.schoolId,
        student.id,
        sessionInt,
        termInt
      );

      // We attach a virtual record so frontend displays correct 'Expected', 'Arrears' and 'Balance'
      student.feeRecords = [{
        id: null,
        studentId: student.id,
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        openingBalance: arrears,
        expectedAmount: expected,
        paidAmount: 0,
        balance: arrears + expected,
        isClearedForExam: (expected === 0 && arrears <= 0)
      }];

      return student;
    }));

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
          schoolId: parseInt(req.schoolId),
          studentId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        Student: {
          include: {
            user: true,
            classModel: true
          }
        },
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Map back to expected names for frontend
    if (feeRecord) {
      feeRecord.student = feeRecord.Student;
      feeRecord.clearedByUser = feeRecord.User;
    }

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

    // NEW: Get all terms for this student to show term-specific breakdown
    const allRecords = await prisma.feeRecord.findMany({
      where: {
        schoolId: parseInt(req.schoolId),
        studentId: studentId
      },
      include: {
        Term: true,
        AcademicSession: true
      },
      orderBy: {
        Term: { startDate: 'asc' }
      }
    });
    
    const outstandingTerms = allRecords.map(r => {
      const termSpecificBalance = (r.expectedAmount || 0) - (r.paidAmount || 0);
      return {
        termId: r.termId,
        sessionId: r.academicSessionId,
        termName: r.Term.name,
        sessionName: r.AcademicSession.name,
        balance: termSpecificBalance,
        cumulativeBalance: r.balance // Keep for reference if needed
      };
    }).filter(t => t.balance !== 0); // Only show terms with a specific balance (positive or negative)

    res.json({
      student,
      ...summary,
      outstandingTerms
    });
  } catch (error) {
    console.error('Error fetching fee summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update fee record (Accountant/Admin)
router.post('/record', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
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

    // Check if student details
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: { isScholarship: true, classId: true, feeDiscount: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Use centralized utility
    const feeRecord = await createOrUpdateFeeRecordWithOpening({
      schoolId: parseInt(req.schoolId),
      studentId: parseInt(studentId),
      termId: parseInt(termId),
      academicSessionId: parseInt(academicSessionId),
      expectedAmount: student.isScholarship ? 0 : Math.max(0, parseFloat(expectedAmount) - (student.feeDiscount || 0)),
      paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : undefined
    });

    // CASCADE UPDATE: Recalculate openingBalance for all subsequent terms
    // This ensures adjusting a fee in one term correctly propagates to future terms
    const currentTermData = await prisma.term.findUnique({
      where: { id: parseInt(termId) }
    });

    if (currentTermData) {
      const subsequentRecords = await prisma.feeRecord.findMany({
        where: {
          studentId: parseInt(studentId),
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { gt: currentTermData.startDate }
          }
        },
        include: { Term: true },
        orderBy: { Term: { startDate: 'asc' } }
      });

      if (subsequentRecords.length > 0) {
        const allPriorRecords = await prisma.feeRecord.findMany({
          where: {
            studentId: parseInt(studentId),
            schoolId: parseInt(req.schoolId),
            Term: {
              startDate: { lte: currentTermData.startDate }
            }
          },
          select: { expectedAmount: true, paidAmount: true }
        });

        let runningDebt = allPriorRecords.reduce((sum, r) => sum + (r.expectedAmount || 0) - (r.paidAmount || 0), 0);

        for (const record of subsequentRecords) {
          const newOpeningBalance = runningDebt;
          const newBalance = newOpeningBalance + record.expectedAmount - record.paidAmount;
          await prisma.feeRecord.update({
            where: { id: record.id },
            data: {
              openingBalance: newOpeningBalance,
              balance: newBalance,
              isClearedForExam: (newBalance <= 0)
            }
          });
          runningDebt += (record.expectedAmount || 0) - (record.paidAmount || 0);
        }
      }
    }

    res.json({
      message: 'Fee record adjusted successfully',
      feeRecord,
      ...(student.isScholarship && {
        warning: 'This student is on scholarship. Fee amount has been automatically set to ₦0.'
      }),
      ...(student.feeDiscount > 0 && !student.isScholarship && {
        warning: `This student has a discount of ₦${student.feeDiscount}. Expected amount adjusted.`
      })
    });

    // Log the action
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'UPDATE_RECORD',
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
router.post('/payment', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const { studentId, termId, academicSessionId, amount, paymentMethod, reference, notes } = req.body;

    if (!studentId || !termId || !academicSessionId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get existing fee record with student, parent, term, and session info
    const feeRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: parseInt(req.schoolId),
          studentId: parseInt(studentId),
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      },
      include: {
        Student: {
          include: {
            user: true,
            parent: {
              include: {
                User: true
              }
            },
            classModel: true
          }
        },
        Term: true,
        AcademicSession: true
      }
    });

    if (!feeRecord) {
      return res.status(404).json({ error: 'Fee record not found. Please create a fee record first.' });
    }

    const paymentAmountNum = parseFloat(amount);
    if (isNaN(paymentAmountNum) || paymentAmountNum <= 0) {
      return res.status(400).json({ error: 'A valid positive payment amount is required' });
    }

    // NEW: Get the student's GRAND TOTAL balance (across all terms) to validate against
    // We fetch the summary for the school's CURRENT term to see the total debt
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId: parseInt(req.schoolId), isCurrent: true }
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: parseInt(req.schoolId), isCurrent: true }
    });

    const studentSummary = await getStudentFeeSummary(
      req.schoolId,
      parseInt(studentId),
      currentSession?.id || parseInt(academicSessionId),
      currentTerm?.id || parseInt(termId)
    );

    const grandTotalBalance = studentSummary?.grandTotal || 0;

    // REMOVED: Overpayment check. We allow admins to record any payment amount.
    // If the payment exceeds the balance, it will result in a credit (negative balance).

    // Use transaction to update fee record and create payment history
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch record inside transaction to get latest balance
      const currentRecord = await tx.feeRecord.findUnique({
        where: { id: feeRecord.id }
      });

      if (!currentRecord) throw new Error('Fee record not found');

      const updatedPaidAmount = currentRecord.paidAmount + paymentAmountNum;
      const updatedBalance = (currentRecord.openingBalance + currentRecord.expectedAmount) - updatedPaidAmount;
      // Removed negative balance check to allow for credits that propagate forward

      // Update fee record
      const updated = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: updatedPaidAmount,
          balance: updatedBalance,
          isClearedForExam: (updatedBalance <= 0)
        },
        include: {
          Student: {
            include: {
              user: true,
              parent: {
                include: {
                  User: true
                }
              },
              classModel: true
            }
          },
          Term: true,
          AcademicSession: true
        }
      });

      // Create payment history record
      const payment = await tx.feePayment.create({
        data: {
          schoolId: parseInt(req.schoolId),
          feeRecordId: feeRecord.id,
          amount: parseFloat(amount),
          paymentMethod: paymentMethod || 'cash',
          reference: reference || null,
          notes: notes || null,
          recordedBy: req.user.id,
          paymentDate: new Date()
        }
      });

      // CASCADE UPDATE: Recalculate openingBalance for all subsequent terms from scratch.
      // This avoids double-counting issues when the utility function also recalculates openingBalance.
      const subsequentRecords = await tx.feeRecord.findMany({
        where: {
          studentId: parseInt(studentId),
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { gt: feeRecord.Term.startDate }
          }
        },
        include: { Term: true },
        orderBy: { Term: { startDate: 'asc' } }
      });

      // Get ALL records for this student to recalculate properly
      const allPriorRecords = await tx.feeRecord.findMany({
        where: {
          studentId: parseInt(studentId),
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { lte: feeRecord.Term.startDate }
          }
        },
        select: { expectedAmount: true, paidAmount: true }
      });

      // Sum all prior debt (including the record we just updated)
      let runningDebt = allPriorRecords.reduce((sum, r) => sum + (r.expectedAmount || 0) - (r.paidAmount || 0), 0);

      for (const record of subsequentRecords) {
        const newOpeningBalance = runningDebt;
        const newBalance = newOpeningBalance + record.expectedAmount - record.paidAmount;
        await tx.feeRecord.update({
          where: { id: record.id },
          data: {
            openingBalance: newOpeningBalance,
            balance: newBalance,
            isClearedForExam: (newBalance <= 0)
          }
        });
        // Add this record's own debt to the running total for the next term
        runningDebt += (record.expectedAmount || 0) - (record.paidAmount || 0);
      }

      return { feeRecord: updated, payment };
    });

    // Map result for email/SMS functions which expect lowercase
    // DEFENSIVE: Ensure we handle both Student (Prisma default) and student (mapped)
    const baseStudent = result.feeRecord.Student || result.feeRecord.student;
    
    const formattedResult = {
      ...result,
      feeRecord: {
        ...result.feeRecord,
        student: baseStudent ? {
          ...baseStudent,
          user: baseStudent.user || baseStudent.User || null,
          parent: baseStudent.parent ? {
            ...baseStudent.parent,
            user: baseStudent.parent.User || baseStudent.parent.user || null
          } : null
        } : null,
        term: result.feeRecord.Term || result.feeRecord.term,
        academicSession: result.feeRecord.AcademicSession || result.feeRecord.academicSession
      }
    };

    // Send payment confirmation email to parent (non-blocking)
    if (formattedResult.feeRecord?.student?.parent?.user?.email) {
      const emailData = {
        parentEmail: formattedResult.feeRecord.student.parent.user.email,
        studentName: formattedResult.feeRecord.student?.user ? (formattedResult.feeRecord.student.middleName ? `${formattedResult.feeRecord.student.user.firstName} ${formattedResult.feeRecord.student.user.lastName} ${formattedResult.feeRecord.student.middleName}` : `${formattedResult.feeRecord.student.user.firstName} ${formattedResult.feeRecord.student.user.lastName}`) : (formattedResult.feeRecord.student?.name || formattedResult.feeRecord.student?.admissionNumber || 'Student'),
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'Cash',
        date: new Date(),
        receiptNumber: formattedResult.payment.id,
        balance: formattedResult.feeRecord.balance,
        termName: formattedResult.feeRecord.term?.name || 'Current Term',
        sessionName: formattedResult.feeRecord.academicSession?.name || 'Current Session',
        schoolName: process.env.SCHOOL_NAME || 'School Management System',
        className: formattedResult.feeRecord.student?.classModel?.name || 'N/A'
      };

      // Send email asynchronously (don't await to avoid blocking)
      sendPaymentConfirmation(emailData).catch(e => console.error('Payment email error:', e));
    }

    // NEW: Send SMS confirmation (non-blocking)
    if (formattedResult.feeRecord?.student?.parent?.phoneNumber || formattedResult.feeRecord?.student?.parent?.phone) {
      const { sendPaymentSMS } = require('../services/smsService');
      const settings = await prisma.school.findUnique({
        where: { id: parseInt(req.schoolId) }
      });
      const schoolName = settings?.name || settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

      const phoneToUse = formattedResult.feeRecord.student?.parent?.phoneNumber || formattedResult.feeRecord.student?.parent?.phone;
      sendPaymentSMS({
        phone: phoneToUse,
        studentName: formattedResult.feeRecord.student?.user ? (formattedResult.feeRecord.student.middleName ? `${formattedResult.feeRecord.student.user.firstName} ${formattedResult.feeRecord.student.user.lastName} ${formattedResult.feeRecord.student.middleName}` : `${formattedResult.feeRecord.student.user.firstName} ${formattedResult.feeRecord.student.user.lastName}`) : (formattedResult.feeRecord.student?.name || formattedResult.feeRecord.student?.admissionNumber || 'Student'),
        amount: parseFloat(amount),
        balance: formattedResult.feeRecord.balance,
        schoolName
      }).catch(e => console.error('Payment SMS error:', e));
    }

    res.json({
      message: 'Payment recorded successfully',
      feeRecord: result.feeRecord,
      payment: result.payment,
      emailSent: !!formattedResult.feeRecord?.student?.parent?.user?.email
    });

    // Log the payment
    logAction({
      schoolId: parseInt(req.schoolId),
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
router.put('/payment/:paymentId', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
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
        schoolId: parseInt(req.schoolId)
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

    if (isNaN(newAmount) || newAmount < 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const difference = newAmount - oldAmount;

    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch everything inside transaction with lock
      const currentPayment = await tx.feePayment.findUnique({
        where: { id: paymentId },
        include: { feeRecord: true }
      });

      if (!currentPayment || currentPayment.schoolId !== parseInt(req.schoolId)) {
        throw new Error('Payment record not found or access denied');
      }

      const feeRecord = await tx.feeRecord.findUnique({
        where: { id: currentPayment.feeRecordId },
        include: { Term: true }
      });

      const updatedPaidAmount = (feeRecord.paidAmount - currentPayment.amount) + newAmount;
      const updatedBalance = (feeRecord.openingBalance + feeRecord.expectedAmount) - updatedPaidAmount;

      if (updatedPaidAmount < 0) {
        throw new Error(`Invalid change. Total paid amount cannot be negative.`);
      }

      // REMOVED: Overpayment check during update. 
      // Allows for corrections that result in a credit balance.

      const updatedFeeRecord = await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: updatedPaidAmount,
          balance: updatedBalance,
          isClearedForExam: (updatedBalance <= 0)
        },
        include: {
          Student: {
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
          schoolId: parseInt(req.schoolId)
        },
        data: {
          amount: newAmount,
          paymentMethod: paymentMethod || payment.paymentMethod,
          reference: reference || payment.reference,
          notes: notes || payment.notes
        }
      });

      // CASCADE UPDATE: Recalculate openingBalance for all subsequent terms from scratch.
      const subsequentRecords = await tx.feeRecord.findMany({
        where: {
          studentId: feeRecord.studentId,
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { gt: feeRecord.Term.startDate }
          }
        },
        include: { Term: true },
        orderBy: { Term: { startDate: 'asc' } }
      });

      // Get ALL records for this student up to and including current to recalculate properly
      const allPriorRecords = await tx.feeRecord.findMany({
        where: {
          studentId: feeRecord.studentId,
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { lte: feeRecord.Term.startDate }
          }
        },
        select: { expectedAmount: true, paidAmount: true }
      });

      let runningDebt = allPriorRecords.reduce((sum, r) => sum + (r.expectedAmount || 0) - (r.paidAmount || 0), 0);

      for (const record of subsequentRecords) {
        const newOpeningBalance = runningDebt;
        const newBalance = newOpeningBalance + record.expectedAmount - record.paidAmount;
        await tx.feeRecord.update({
          where: { id: record.id },
          data: {
            openingBalance: newOpeningBalance,
            balance: newBalance,
            isClearedForExam: (newBalance <= 0)
          }
        });
        runningDebt += (record.expectedAmount || 0) - (record.paidAmount || 0);
      }

      return { feeRecord: updatedFeeRecord, payment: updatedPayment };
    });

    res.json({
      message: 'Payment updated successfully',
      feeRecord: result.feeRecord,
      payment: result.payment
    });

    // Log the update
    logAction({
      schoolId: parseInt(req.schoolId),
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
// Delete payment (Accountant/Admin)
router.delete('/payment/:paymentId', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);

    // Get existing payment
    const payment = await prisma.feePayment.findFirst({
      where: {
        id: paymentId,
        schoolId: parseInt(req.schoolId)
      },
      include: {
        FeeRecord: {
          include: { Term: true }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const feeRecord = payment.FeeRecord;

    await prisma.$transaction(async (tx) => {
      // 1. Delete the payment
      await tx.feePayment.delete({
        where: { id: paymentId }
      });

      // 2. Update the parent fee record
      const updatedPaidAmount = feeRecord.paidAmount - payment.amount;
      const updatedBalance = (feeRecord.openingBalance + feeRecord.expectedAmount) - updatedPaidAmount;

      await tx.feeRecord.update({
        where: { id: feeRecord.id },
        data: {
          paidAmount: updatedPaidAmount,
          balance: updatedBalance,
          isClearedForExam: (updatedBalance <= 0)
        }
      });

      // 3. CASCADE UPDATE: Recalculate openingBalance for all subsequent terms
      const subsequentRecords = await tx.feeRecord.findMany({
        where: {
          studentId: feeRecord.studentId,
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { gt: feeRecord.Term.startDate }
          }
        },
        include: { Term: true },
        orderBy: { Term: { startDate: 'asc' } }
      });

      // Get total debt up to this term after deletion
      const allPriorRecords = await tx.feeRecord.findMany({
        where: {
          studentId: feeRecord.studentId,
          schoolId: parseInt(req.schoolId),
          Term: {
            startDate: { lte: feeRecord.Term.startDate }
          }
        },
        select: { expectedAmount: true, paidAmount: true }
      });

      let runningDebt = allPriorRecords.reduce((sum, r) => sum + (r.expectedAmount || 0) - (r.paidAmount || 0), 0);

      for (const record of subsequentRecords) {
        const newOpeningBalance = runningDebt;
        const newBalance = newOpeningBalance + record.expectedAmount - record.paidAmount;
        await tx.feeRecord.update({
          where: { id: record.id },
          data: {
            openingBalance: newOpeningBalance,
            balance: newBalance,
            isClearedForExam: (newBalance <= 0)
          }
        });
        runningDebt += (record.expectedAmount || 0) - (record.paidAmount || 0);
      }
    });

    res.json({ message: 'Payment deleted successfully' });

    // Log the deletion
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'DELETE',
      resource: 'FEE_PAYMENT',
      details: {
        paymentId,
        studentId: feeRecord.studentId,
        amount: payment.amount,
        termId: feeRecord.termId
      },
      ipAddress: req.ip
    });

  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for a student
router.get('/payments/:studentId', authenticate, authorize(['admin', 'principal', 'accountant', 'student']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.query;

    if (req.user.role === 'student') {
      // Find the student record associated with this user
      const student = await prisma.student.findFirst({
        where: {
          userId: req.user.id,
          schoolId: parseInt(req.schoolId)
        }
      });

      if (!student || student.id !== studentId) {
        return res.status(403).json({ error: 'You are not authorized to view this payment history.' });
      }
    }

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    let payments = [];
    if (termId === 'all') {
      payments = await prisma.feePayment.findMany({
        where: {
          FeeRecord: {
            studentId,
            academicSessionId: parseInt(academicSessionId),
            schoolId: parseInt(req.schoolId)
          }
        },
        include: {
          recordedByUser: {
            select: { firstName: true, lastName: true }
          },
          FeeRecord: {
            include: { Term: true }
          }
        },
        orderBy: { paymentDate: 'desc' }
      });
    } else {
      // Get specific fee record
      const feeRecord = await prisma.feeRecord.findUnique({
        where: {
          schoolId_studentId_termId_academicSessionId: {
            schoolId: parseInt(req.schoolId),
            studentId,
            termId: parseInt(termId),
            academicSessionId: parseInt(academicSessionId)
          }
        }
      });

      if (feeRecord) {
        payments = await prisma.feePayment.findMany({
          where: {
            feeRecordId: feeRecord.id,
            schoolId: parseInt(req.schoolId)
          },
          include: {
            recordedByUser: {
              select: { firstName: true, lastName: true }
            },
            FeeRecord: {
              include: { Term: true }
            }
          },
          orderBy: { paymentDate: 'desc' }
        });
      }
    }

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message });
  }
});


// Consolidate clearance logic into a single toggle for easier management
router.post('/toggle-clearance/:studentId', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
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
          schoolId: parseInt(req.schoolId),
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
        select: { classId: true, isScholarship: true, feeDiscount: true }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: {
          schoolId: parseInt(req.schoolId),
          classId: student.classId,
          termId: parseInt(termId),
          academicSessionId: parseInt(academicSessionId)
        }
      });

      // Scholarship students get 0 fees, discount gets subtracted
      const expectedAmount = student.isScholarship ? 0 : Math.max(0, (feeStructure?.amount || 0) - (student.feeDiscount || 0));

      feeRecord = await prisma.feeRecord.create({
        data: {
          schoolId: parseInt(req.schoolId),
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
      schoolId: parseInt(req.schoolId),
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

router.post('/clear/:studentId', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;
    // Use updateMany to handle missing record gracefully or upsert would be better but we need student class info
    // For simplicity, we check if exists, then update or create
    const record = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: parseInt(req.schoolId),
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
        select: { classId: true, isScholarship: true, feeDiscount: true }
      });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: { schoolId: parseInt(req.schoolId), classId: student?.classId, termId: parseInt(termId), academicSessionId: parseInt(academicSessionId) }
      });

      // Scholarship students get 0 fees, discount gets subtracted
      const expectedAmount = student.isScholarship ? 0 : Math.max(0, (feeStructure?.amount || 0) - (student.feeDiscount || 0));

      await prisma.feeRecord.create({
        data: {
          schoolId: parseInt(req.schoolId),
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

router.post('/revoke-clearance/:studentId', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { termId, academicSessionId } = req.body;
    // Use updateMany for simplicity if record exists
    const record = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: parseInt(req.schoolId),
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
        select: { classId: true, isScholarship: true, feeDiscount: true }
      });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const feeStructure = await prisma.classFeeStructure.findFirst({
        where: { schoolId: parseInt(req.schoolId), classId: student?.classId, termId: parseInt(termId), academicSessionId: parseInt(academicSessionId) }
      });

      // Scholarship students get 0 fees, discount gets subtracted
      const expectedAmount = student.isScholarship ? 0 : Math.max(0, (feeStructure?.amount || 0) - (student.feeDiscount || 0));

      await prisma.feeRecord.create({
        data: {
          schoolId: parseInt(req.schoolId),
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
router.get('/summary', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, ignoreJoinDate } = req.query;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term ID and Academic Session ID are required' });
    }

    const schoolIdInt = parseInt(req.schoolId);
    const tId = parseInt(termId);
    const sId = parseInt(academicSessionId);
    const shouldIgnoreJoinDate = ignoreJoinDate === 'true';

    // Determine if we're looking at historical data
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId: schoolIdInt, isCurrent: true }
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: schoolIdInt, isCurrent: true }
    });

    const targetTerm = await prisma.term.findUnique({
      where: { id: tId }
    });

    const isCurrentPeriod = (sId === currentSession?.id) && (tId === currentTerm?.id);

    // 1. Get students — for historical periods, include all students with fee records
    let students;
    if (isCurrentPeriod) {
      students = await prisma.student.findMany({
        where: { schoolId: schoolIdInt, status: 'active' },
        include: {
          FeeRecord: { where: { termId: tId, academicSessionId: sId } }
        }
      });
    } else {
      students = await prisma.student.findMany({
        where: {
          OR: [
            { schoolId: schoolIdInt, status: 'active' },
            { schoolId: schoolIdInt, FeeRecord: { some: { termId: tId, academicSessionId: sId } } }
          ]
        },
        include: {
          FeeRecord: { where: { termId: tId, academicSessionId: sId } }
        }
      });
    }

    // Map FeeRecord to feeRecords for calculation logic
    students = students.map(s => ({
      ...s,
      feeRecords: s.FeeRecord
    }));

    // 2. Get fee structures for this term/session
    const feeStructures = await prisma.classFeeStructure.findMany({
      where: { schoolId: schoolIdInt, termId: tId, academicSessionId: sId }
    });

    const structureMap = {};
    feeStructures.forEach(fs => {
      structureMap[fs.classId] = fs.amount;
    });

    // 3. Aggregate data across all students (Real + Virtual)
    let totalStudents = students.length;
    let totalExpected = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let clearedStudents = 0;
    let restrictedStudents = 0;
    let fullyPaid = 0;
    let partiallyPaid = 0;
    let notPaid = 0;

    for (const student of students) {
      let record = student.feeRecords[0];
      let expected = 0;
      let paid = 0;
      let balance = 0;
      let isCleared = false;

      if (record) {
        // Use existing database record - calculate term-specific balance for stats
        expected = record.expectedAmount;
        paid = record.paidAmount;
        balance = expected - paid; // Changed from record.balance to be term-specific
        isCleared = record.isClearedForExam;
      } else {
        // Calculate virtual record - use term-specific expected for stats
        // Check if student joined after this term ended (mid-session joiner)
        const joinedAfterTerm = !shouldIgnoreJoinDate && targetTerm && student.createdAt > targetTerm.endDate;
        const classExpected = (student.isScholarship || joinedAfterTerm) ? 0 : Math.max(0, (structureMap[student.classId] || 0) - (student.feeDiscount || 0));

        expected = classExpected;
        paid = 0;
        balance = classExpected; // Changed from arrears + classExpected to be term-specific
        isCleared = (classExpected === 0); // Simplified for term-specific clearing
      }

      // Aggregate
      totalExpected += expected;
      totalPaid += paid;
      totalBalance += balance;
      if (isCleared) clearedStudents++;
      else restrictedStudents++;

      if (balance <= 0) fullyPaid++;
      else if (paid > 0) partiallyPaid++;
      else notPaid++;
    }

    // 4. Calculate GRAND TOTAL balance across ALL terms for ALL active students.
    // FIX: Sum (expected - paid) across every fee record, not just the latest one.
    // This ensures students who owe from previous terms but have no current record are included.
    const allActiveStudents = await prisma.student.findMany({
      where: { schoolId: schoolIdInt, status: 'active' },
      include: {
        FeeRecord: {
          select: { expectedAmount: true, paidAmount: true }
        }
      }
    });

    const grandTotalBalance = allActiveStudents.reduce((sum, s) => {
      const studentTotal = (s.FeeRecord || []).reduce((rSum, r) => {
        return rSum + ((r.expectedAmount || 0) - (r.paidAmount || 0));
      }, 0);
      return sum + studentTotal;
    }, 0);

    res.json({
      totalStudents,
      totalExpected,
      totalPaid,
      totalBalance, // This is term-specific
      clearedStudents,
      restrictedStudents,
      fullyPaid,
      partiallyPaid,
      notPaid,
      grandTotalBalance // This is cumulative
    });
  } catch (error) {
    console.error('Error fetching fee summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk send fee reminders
router.post('/bulk-reminder', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, classId } = req.body;

    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term and Session are required' });
    }

    const where = {
      schoolId: parseInt(req.schoolId),
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
      where: { id: parseInt(req.schoolId) }
    });
    const schoolName = settings?.name || settings?.schoolName || process.env.SCHOOL_NAME || 'School Management System';

    let sentCount = 0;
    for (const record of debtors) {
      if (record.student.parent?.user?.email) {
        const reminderData = {
          parentEmail: record.student.parent.user.email,
          studentName: record.student.user ? `${record.student.user.firstName} ${record.student.user.lastName}` : (record.student.admissionNumber || 'Student'),
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
router.post('/sync-records', authenticate, authorize(['admin', 'principal', 'accountant']), async (req, res) => {
  try {
    const { termId, academicSessionId, ignoreJoinDate } = req.body;
    if (!termId || !academicSessionId) {
      return res.status(400).json({ error: 'Term and Session are required for sync' });
    }

    const schoolIdInt = parseInt(req.schoolId);
    const shouldIgnoreJoinDate = ignoreJoinDate === true;

    // 1. Get students for sync
    // For current sessions, only active students.
    // For historical sessions, include all who were in the school (had promotion records) or are active.
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId: schoolIdInt, isCurrent: true }
    });
    
    let students;
    if (parseInt(academicSessionId) === currentSession?.id) {
      students = await prisma.student.findMany({
        where: { schoolId: schoolIdInt, status: 'active' }
      });
    } else {
      students = await prisma.student.findMany({
        where: {
          OR: [
            { schoolId: schoolIdInt, status: 'active' },
            { schoolId: schoolIdInt, promotionHistory: { some: { academicSessionId: parseInt(academicSessionId) } } }
          ]
        }
      });
    }

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

    const targetTerm = await prisma.term.findUnique({
      where: { id: parseInt(termId) }
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let noStructureCount = 0;

    // 3. For each student, check if record exists, if not create/update it
    for (const student of students) {
      try {
        // Check if student joined after this term ended (mid-session joiner)
        if (!shouldIgnoreJoinDate && targetTerm && student.createdAt > targetTerm.endDate) {
          skippedCount++;
          continue;
        }

        const amount = structureMap[student.classId];
        if (amount === undefined) {
          noStructureCount++;
        }

        const stAmount = student.isScholarship ? 0 : Math.max(0, (amount || 0) - (student.feeDiscount || 0));

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
      message: `Sync completed: ${createdCount} created, ${updatedCount} updated. ${noStructureCount > 0 ? `Notice: ${noStructureCount} students have no fee structure defined for their class.` : ''}`,
      createdCount,
      updatedCount,
      skippedCount,
      noStructureCount
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

// RESET STUDENT LEDGER - Wipes all fee records and payments for a student
router.delete('/student/:studentId/reset', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists and belongs to the school
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: { schoolId: true }
    });

    if (!student || student.schoolId !== parseInt(req.schoolId)) {
      return res.status(404).json({ error: 'Student not found or unauthorized access' });
    }

    // Delete all OnlinePayments (related to fee records)
    await prisma.onlinePayment.deleteMany({
      where: {
        studentId: parseInt(studentId),
        schoolId: parseInt(req.schoolId)
      }
    });

    // Delete all FeePayments first (due to foreign key constraints)
    await prisma.feePayment.deleteMany({
      where: {
        FeeRecord: {
          studentId: parseInt(studentId),
          schoolId: parseInt(req.schoolId)
        }
      }
    });

    // 3. Reset all FeeRecords instead of deleting them
    // This preserves the "fee structure" (expected amounts) as requested
    const feeRecords = await prisma.feeRecord.findMany({
      where: {
        studentId: parseInt(studentId),
        schoolId: parseInt(req.schoolId)
      },
      include: { Term: true },
      orderBy: { Term: { startDate: 'asc' } }
    });

    let runningDebt = 0;
    for (const record of feeRecords) {
      const newOpeningBalance = runningDebt;
      const newBalance = newOpeningBalance + record.expectedAmount; // paidAmount is now 0
      
      await prisma.feeRecord.update({
        where: { id: record.id },
        data: {
          openingBalance: newOpeningBalance,
          paidAmount: 0,
          balance: newBalance,
          isClearedForExam: (newBalance <= 0),
          clearedBy: null,
          clearedAt: null
        }
      });
      
      // Update running debt for the next term
      runningDebt += record.expectedAmount;
    }

    // Log the action
    logAction({
      schoolId: parseInt(req.schoolId),
      userId: req.user.id,
      action: 'RESET_LEDGER',
      resource: 'FEE_HISTORY',
      details: { studentId: parseInt(studentId) },
      ipAddress: req.ip
    });

    res.json({ message: 'Student ledger has been completely reset successfully.' });
  } catch (error) {
    console.error('Error resetting student ledger:', error);
    res.status(500).json({ error: 'Internal server error while resetting ledger' });
  }
});

module.exports = router;
