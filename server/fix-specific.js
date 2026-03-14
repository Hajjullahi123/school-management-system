// Fix specific students:
// 1. Delete Sale Hashim's incorrect First Term record (enrolled March 5, shouldn't owe from Sept)
// 2. Repair AAM/2026/JSS2A/020's opening balances
const prisma = require('./db');

async function fix() {
  // 1. Delete Sale Hashim's First Term record
  const hashim = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/SH/2026/090' }
  });

  if (hashim) {
    const deleted = await prisma.feeRecord.deleteMany({
      where: {
        studentId: hashim.id,
        term: { name: { contains: 'First' } },
        paidAmount: 0
      }
    });
    console.log(`Deleted ${deleted.count} incorrect record(s) for Sale Hashim`);
  }

  // 2. Repair AAM/2026/JSS2A/020 opening balances
  const student020 = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/2026/JSS2A/020' }
  });

  if (student020) {
    const records = await prisma.feeRecord.findMany({
      where: { studentId: student020.id },
      include: { term: { select: { name: true, startDate: true } } },
      orderBy: { term: { startDate: 'asc' } }
    });

    let cumulativeExpected = 0;
    let cumulativePaid = 0;

    for (const record of records) {
      const correctOpening = Math.max(0, cumulativeExpected - cumulativePaid);
      const expected = parseFloat(record.expectedAmount) || 0;
      const paid = parseFloat(record.paidAmount) || 0;
      const correctBalance = correctOpening + expected - paid;

      if (Math.abs(parseFloat(record.openingBalance) - correctOpening) > 0.01) {
        await prisma.feeRecord.update({
          where: { id: record.id },
          data: { openingBalance: correctOpening, balance: correctBalance }
        });
        console.log(`FIXED ${student020.admissionNumber} ${record.term.name}: opening ${record.openingBalance}->${correctOpening}, balance ${record.balance}->${correctBalance}`);
      } else {
        console.log(`OK ${student020.admissionNumber} ${record.term.name}: opening=${correctOpening}, balance=${correctBalance}`);
      }

      cumulativeExpected += expected;
      cumulativePaid += paid;
    }
  }

  await prisma.$disconnect();
}

fix();
