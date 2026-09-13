/**
 * Repair script: Recalculate openingBalance and balance for ALL fee records.
 * 
 * For each student, orders their fee records by term start date,
 * then recalculates openingBalance = SUM(previous expectedAmounts) - SUM(previous paidAmounts)
 * and balance = openingBalance + expectedAmount - paidAmount.
 * 
 * Usage: node server/repair-opening-balances.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairOpeningBalances() {
  console.log('=== REPAIR: Recalculating opening balances for all fee records ===\n');

  try {
    // Get all schools
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });

    for (const school of schools) {
      console.log(`\nSchool: ${school.name} (ID: ${school.id})`);

      // Get all students in this school
      const students = await prisma.student.findMany({
        where: { schoolId: school.id },
        select: { id: true, admissionNumber: true }
      });

      let fixedCount = 0;

      for (const student of students) {
        // Get all fee records for this student, ordered by term start date
        const feeRecords = await prisma.feeRecord.findMany({
          where: {
            schoolId: school.id,
            studentId: student.id
          },
          include: {
            term: { select: { startDate: true, name: true } }
          },
          orderBy: {
            term: { startDate: 'asc' }
          }
        });

        if (feeRecords.length === 0) continue;

        // Walk through records in chronological order
        let cumulativeExpected = 0;
        let cumulativePaid = 0;

        for (const record of feeRecords) {
          const correctOpening = cumulativeExpected - cumulativePaid;
          const opening = correctOpening; // Allow negative opening balances (credits)
          const expected = parseFloat(record.expectedAmount) || 0;
          const paid = parseFloat(record.paidAmount) || 0;
          const correctBalance = opening + expected - paid;

          const oldOpening = parseFloat(record.openingBalance) || 0;
          const oldBalance = parseFloat(record.balance) || 0;

          if (Math.abs(oldOpening - opening) > 0.01 || Math.abs(oldBalance - correctBalance) > 0.01) {
            console.log(`  FIX ${student.admissionNumber} | ${record.term.name}: opening ${oldOpening} -> ${opening}, balance ${oldBalance} -> ${correctBalance}`);

            await prisma.feeRecord.update({
              where: { id: record.id },
              data: {
                openingBalance: opening,
                balance: correctBalance > 0 ? correctBalance : 0,
                isClearedForExam: (correctBalance <= 0)
              }
            });
            fixedCount++;
          }

          // Accumulate for next term
          cumulativeExpected += expected;
          cumulativePaid += paid;
        }
      }

      console.log(`  Total records fixed for ${school.name}: ${fixedCount}`);
    }

    console.log('\n=== REPAIR COMPLETE ===');
  } catch (error) {
    console.error('Repair error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairOpeningBalances();
