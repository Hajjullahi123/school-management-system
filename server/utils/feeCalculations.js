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

    // Sum up all outstanding balances with NaN protection
    const totalOutstanding = previousRecords.reduce((sum, record) => {
      const bal = parseFloat(record.balance) || 0;
      return sum + (isNaN(bal) ? 0 : bal);
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

    // Helper to safely parse numbers
    const safeParse = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

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
        defaultExpected = safeParse(feeStructure?.amount, 0);
      }
    }

    // Calculate previous outstanding
    const previousOutstanding = await calculatePreviousOutstanding(
      sId,
      studId,
      sessId,
      tId
    );

    // Calculate totals with NaN protection
    const openingBalance = safeParse(currentRecord?.openingBalance, previousOutstanding);
    const currentTermFee = safeParse(currentRecord?.expectedAmount, defaultExpected);
    const totalExpected = openingBalance + currentTermFee;
    const totalPaid = safeParse(currentRecord?.paidAmount, 0);

    // Balance calculation
    const currentBalance = currentRecord ? safeParse(currentRecord.balance, 0) : (totalExpected - totalPaid);
    const grandTotal = currentBalance;

    // Construct a virtual record if needed for frontend consistency
    const effectiveRecord = currentRecord || {
      id: null,
      expectedAmount: currentTermFee,
      paidAmount: 0,
      balance: isNaN(currentBalance) ? 0 : currentBalance,
      isClearedForExam: false
    };

    return {
      currentRecord: effectiveRecord,
      openingBalance,
      previousOutstanding,
      currentTermFee,
      totalExpected,
      totalPaid,
      currentBalance: isNaN(currentBalance) ? 0 : currentBalance,
      grandTotal: isNaN(grandTotal) ? 0 : grandTotal,
      payments: currentRecord?.payments || [],
      expectedAmount: currentTermFee,
      balance: isNaN(currentBalance) ? 0 : currentBalance,
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

    // Helper to safely parse numbers
    const safeParse = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    // Calculate values, using existing if not provided
    const numExpected = expectedAmount !== undefined ? safeParse(expectedAmount, existing?.expectedAmount || 0) : (existing?.expectedAmount || 0);
    const numPaid = paidAmount !== undefined ? safeParse(paidAmount, existing?.paidAmount || 0) : (existing?.paidAmount || 0);
    const safeOpening = safeParse(openingBalance, 0);
    const balance = safeOpening + numExpected - numPaid;

    // Exam clearance logic
    const isClearedForExam = (numExpected === 0) || (balance <= 0);

    if (existing) {
      // Update existing record
      return await prisma.feeRecord.update({
        where: { id: existing.id },
        data: {
          openingBalance: safeOpening,
          expectedAmount: numExpected,
          paidAmount: numPaid,
          balance: isNaN(balance) ? 0 : balance,
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
          openingBalance: safeOpening,
          expectedAmount: numExpected,
          paidAmount: numPaid,
          balance: isNaN(balance) ? 0 : balance,
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
