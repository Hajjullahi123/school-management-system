const prisma = require('./db');

async function fix() {
  const s = await prisma.student.findFirst({ where: { admissionNumber: 'AAM/SH/2026/090' } });
  if (!s) { console.log('Not found'); await prisma.$disconnect(); return; }

  const records = await prisma.feeRecord.findMany({
    where: { studentId: s.id },
    include: { term: { select: { name: true } } }
  });

  console.log(`Records for Sale Hashim: ${records.length}`);
  for (const r of records) {
    console.log(`  ${r.term.name}: id=${r.id}, opening=${r.openingBalance}, expected=${r.expectedAmount}, paid=${r.paidAmount}, balance=${r.balance}`);
  }

  // Delete First Term record (no payments made, student wasn't enrolled then)
  for (const r of records) {
    if (r.term.name.toLowerCase().includes('first') && r.paidAmount === 0) {
      await prisma.feeRecord.delete({ where: { id: r.id } });
      console.log(`\nDELETED First Term record (id: ${r.id})`);
    }
  }

  await prisma.$disconnect();
}

fix();
