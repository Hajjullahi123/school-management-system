const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixScholarshipFees() {
  console.log('--- STARTING SCHOLARSHIP FEE FIX ---');

  try {
    // 1. Find all students on scholarship
    const scholarshipStudents = await prisma.student.findMany({
      where: { isScholarship: true },
      select: { id: true, name: true, schoolId: true }
    });

    console.log(`Found ${scholarshipStudents.length} scholarship students.`);

    let fixedCount = 0;

    for (const student of scholarshipStudents) {
      // 2. Find their current term fee records with expectedAmount > 0
      const recordsToFix = await prisma.feeRecord.findMany({
        where: {
          studentId: student.id,
          expectedAmount: { gt: 0 }
        }
      });

      for (const record of recordsToFix) {
        console.log(`Fixing record for student: ${student.name} (ID: ${student.id})`);
        console.log(`Current expected: ${record.expectedAmount}, current balance: ${record.balance}`);

        // Update record: expectedAmount to 0, balance to (0 - paidAmount)
        await prisma.feeRecord.update({
          where: { id: record.id },
          data: {
            expectedAmount: 0,
            balance: 0 - record.paidAmount
          }
        });

        fixedCount++;
      }
    }

    console.log(`--- FINISHED. Total records fixed: ${fixedCount} ---`);
  } catch (error) {
    console.error('Error fixing scholarship fees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixScholarshipFees();
