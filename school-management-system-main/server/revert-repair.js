// Revert the repair script changes for AAM/2026/JSS2A/020
const prisma = require('./db');

async function revert() {
  console.log('Reverting repair changes...');

  // Find the student
  const student = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/2026/JSS2A/020' }
  });

  if (!student) {
    console.log('Student not found');
    await prisma.$disconnect();
    return;
  }

  // Get their fee records ordered by term
  const records = await prisma.feeRecord.findMany({
    where: { studentId: student.id },
    include: { term: { select: { name: true, startDate: true } } },
    orderBy: { term: { startDate: 'asc' } }
  });

  for (const r of records) {
    console.log(`BEFORE: ${r.term.name} | opening: ${r.openingBalance}, expected: ${r.expectedAmount}, paid: ${r.paidAmount}, balance: ${r.balance}`);
  }

  // Revert Second Term: opening back to 0, balance = 0 + expected - paid
  // Revert Third Term: opening back to 12000 (the previous term's balance)
  for (const r of records) {
    if (r.term.name.toLowerCase().includes('second')) {
      const newBalance = 0 + parseFloat(r.expectedAmount) - parseFloat(r.paidAmount);
      await prisma.feeRecord.update({
        where: { id: r.id },
        data: { openingBalance: 0, balance: newBalance }
      });
      console.log(`REVERTED Second Term: opening -> 0, balance -> ${newBalance}`);
    }
    if (r.term.name.toLowerCase().includes('third')) {
      const newBalance = 12000 + parseFloat(r.expectedAmount) - parseFloat(r.paidAmount);
      await prisma.feeRecord.update({
        where: { id: r.id },
        data: { openingBalance: 12000, balance: newBalance }
      });
      console.log(`REVERTED Third Term: opening -> 12000, balance -> ${newBalance}`);
    }
  }

  console.log('Revert complete.');
  await prisma.$disconnect();
}

revert();
