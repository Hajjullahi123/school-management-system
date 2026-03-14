// Quick check: what fee records exist for Sale Hashim?
const prisma = require('./db');

async function check() {
  const student = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/SH/2026/090' },
    select: { id: true, admissionNumber: true, createdAt: true }
  });

  if (!student) {
    console.log('Student not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Student:', student);

  const records = await prisma.feeRecord.findMany({
    where: { studentId: student.id },
    include: { term: { select: { name: true, startDate: true } } },
    orderBy: { term: { startDate: 'asc' } }
  });

  console.log(`\nFee records for ${student.admissionNumber}: ${records.length}`);
  for (const r of records) {
    console.log(`  ${r.term.name}: opening=${r.openingBalance}, expected=${r.expectedAmount}, paid=${r.paidAmount}, balance=${r.balance}`);
  }

  await prisma.$disconnect();
}

check();
