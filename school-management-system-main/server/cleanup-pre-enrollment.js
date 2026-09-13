// Delete fee records for terms before student enrollment
const prisma = require('./db');

async function cleanup() {
  console.log('Cleaning up fee records from before student enrollment...\n');

  // Get all students
  const students = await prisma.student.findMany({
    where: { status: 'active' },
    include: {
      feeRecords: {
        include: { term: { select: { name: true, startDate: true } } }
      }
    }
  });

  let deleted = 0;

  for (const student of students) {
    for (const record of student.feeRecords) {
      // If the term started BEFORE the student was created AND no payments were made
      if (new Date(record.term.startDate) < new Date(student.createdAt) && record.paidAmount === 0) {
        console.log(`DELETE: ${student.admissionNumber} | ${record.term.name} (term started ${record.term.startDate.toISOString().split('T')[0]}, student enrolled ${student.createdAt.toISOString().split('T')[0]})`);
        await prisma.feeRecord.delete({ where: { id: record.id } });
        deleted++;
      }
    }
  }

  console.log(`\nDeleted ${deleted} incorrect records.`);
  await prisma.$disconnect();
}

cleanup();
