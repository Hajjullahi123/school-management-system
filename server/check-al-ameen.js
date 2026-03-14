const prisma = require('./db');

async function check() {
  const s = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/2025/JSS1A/084' },
    select: { id: true, admissionNumber: true, createdAt: true }
  });

  if (!s) { console.log('Student not found'); await prisma.$disconnect(); return; }
  console.log(`Student: ${s.admissionNumber}, Enrolled: ${s.createdAt}`);

  const records = await prisma.feeRecord.findMany({
    where: { studentId: s.id },
    include: { term: { select: { name: true, startDate: true } } },
    orderBy: { term: { startDate: 'asc' } }
  });

  console.log(`\nFee records: ${records.length}`);
  for (const r of records) {
    console.log(`  ${r.term.name} (${r.term.startDate}): expected=${r.expectedAmount}, paid=${r.paidAmount}`);
  }

  await prisma.$disconnect();
}

check();
