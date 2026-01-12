const prisma = require('../db');

/**
 * Calculate the total outstanding balance from all previous sessions/terms
 * @param {number} schoolId - School ID
 * @param {number} studentId - Student ID
 * @param {number} currentSessionId - Current academic session ID
 * @param {number} currentTermId - Current term ID
 * @returns {Promise<number>} - Total outstanding balance
 */
async function calculatePreviousOutstanding(schoolId, studentId, currentSessionId, currentTermId) {
  try {
    const sId = Number(schoolId);
    const studId = Number(studentId);
    const sessId = Number(currentSessionId);
    const termId = Number(currentTermId);

    // Get all previous fee records (before current session/term)
    const previousRecords = await prisma.feeRecord.findMany({
      where: {
        schoolId: sId,
        studentId: studId,
        OR: [
          // Records from previous sessions
          {
            academicSessionId: { not: sessId }
          },
          // Records from previous terms in the same session
          {
            academicSessionId: sessId,
            termId: { not: termId }
          }
        ]
      },
      select: {
        balance: true,
        openingBalance: true,
        expectedAmount: true,
        paidAmount: true
      }
    });

    // Sum up all outstanding balances
    const totalOutstanding = previousRecords.reduce((sum, record) => {
      return sum + (record.balance || 0);
    }, 0);

    return totalOutstanding;
  } catch (error) {
    console.error('Error calculating previous outstanding:', error);
    return 0;
  }
}

/**
 * Get comprehensive fee summary for a student including opening balance
 * @param {number} schoolId - School ID
 * @param {number} studentId - Student ID
 * @param {number} sessionId - Academic session ID
 * @param {number} termId - Term ID
 * @returns {Promise<object>} - Fee summary with opening balance
 */
async function getStudentFeeSummary(schoolId, studentId, sessionId, termId) {
  try {
    const sId = Number(schoolId);
    const studId = Number(studentId);
    const sessId = Number(sessionId);
    const tId = Number(termId);

    // Get current term fee record
    const currentRecord = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: sId,
          studentId: studId,
          termId: tId,
          academicSessionId: sessId
        }
      },
      include: {
        term: true,
        academicSession: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    // If no current record, check if we need to fetch default structure
    let defaultExpected = 0;

    if (!currentRecord) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isScholarship: true }
      });

      if (student && !student.isScholarship) {
        const feeStructure = await prisma.classFeeStructure.findFirst({
          where: {
            schoolId: sId,
            classId: student.classId,
            academicSessionId: sessId,
            termId: tId
          }
        });
        defaultExpected = feeStructure?.amount || 0;
      }
    }

    // Calculate previous outstanding
    const previousOutstanding = await calculatePreviousOutstanding(
      sId,
      studId,
      sessId,
      tId
    );

    // Calculate totals
    const openingBalance = currentRecord?.openingBalance || previousOutstanding;
    const currentTermFee = currentRecord?.expectedAmount || defaultExpected;
    const totalExpected = openingBalance + currentTermFee;
    const totalPaid = currentRecord?.paidAmount || 0;

    // Balance calculation:
    // If record exists, use stored balance.
    // If not, calculate: opening + currentTermFee - paid (which is 0)
    const currentBalance = currentRecord ? currentRecord.balance : (totalExpected - totalPaid);
    const grandTotal = currentBalance; // Total outstanding is the current balance

    // Construct a virtual record if needed for frontend consistency
    const effectiveRecord = currentRecord || {
      id: null,
      expectedAmount: currentTermFee,
      paidAmount: 0,
      balance: currentBalance,
      isClearedForExam: false
    };

    return {
      currentRecord: effectiveRecord,
      openingBalance,
      previousOutstanding,
      currentTermFee,
      totalExpected,
      totalPaid,
      currentBalance,
      grandTotal,
      payments: currentRecord?.payments || [],
      expectedAmount: currentTermFee, // Match frontend expectations usually looking for this on root or record
      balance: currentBalance,
      paidAmount: totalPaid
    };
  } catch (error) {
    console.error('Error getting fee summary:', error);
    return null;
  }
}

/**
 * Create or update fee record with opening balance
 * @param {object} data - Fee record data
 * @returns {Promise<object>} - Created/updated fee record
 */
async function createOrUpdateFeeRecordWithOpening(data) {
  const { schoolId, studentId, termId, academicSessionId, expectedAmount, paidAmount = 0 } = data;

  try {
    const sId = Number(schoolId);
    const studId = Number(studentId);
    const tId = Number(termId);
    const sessId = Number(academicSessionId);

    // Calculate opening balance from previous records
    const openingBalance = await calculatePreviousOutstanding(
      sId,
      studId,
      sessId,
      tId
    );

    // Calculate balance: opening + expected - paid
    const numExpected = parseFloat(expectedAmount) || 0;
    const numPaid = parseFloat(paidAmount) || 0;
    const balance = openingBalance + numExpected - numPaid;

    // Exam clearance logic: 
    // Auto-clear if they are scholarship OR balance is 0
    // Otherwise restrict if they owe money
    const isClearedForExam = (numExpected === 0) || (balance <= 0);

    // Check if record exists
    const existing = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId: sId,
          studentId: studId,
          termId: tId,
          academicSessionId: sessId
        }
      }
    });

    if (existing) {
      // Update existing record
      return await prisma.feeRecord.update({
        where: { id: existing.id },
        data: {
          openingBalance,
          expectedAmount: numExpected,
          paidAmount: numPaid,
          balance,
          isClearedForExam
        }
      });
    } else {
      // Create new record
      return await prisma.feeRecord.create({
        data: {
          schoolId: sId,
          studentId: studId,
          termId: tId,
          academicSessionId: sessId,
          openingBalance,
          expectedAmount: numExpected,
          paidAmount: numPaid,
          balance,
          isClearedForExam
        }
      });
    }
  } catch (error) {
    console.error('Error creating/updating fee record:', error);
    throw error;
  }
}

module.exports = {
  calculatePreviousOutstanding,
  getStudentFeeSummary,
  createOrUpdateFeeRecordWithOpening
};
