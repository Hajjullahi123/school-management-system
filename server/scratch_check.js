const prisma = require('./db');

async function main() {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: new Date('2026-04-18T00:00:00'),
        lte: new Date('2026-04-18T23:59:59')
      }
    },
    include: {
        student: { include: { user: true } }
    }
  });
  console.log('Found records for 04/18/2026 (Local Day Range):', records.length);
  records.forEach(r => {
    console.log(`Student: ${r.student.user.firstName} ${r.student.user.lastName}, Status: [${r.status}], Date: ${r.date.toISOString()}, Raw: ${r.date}`);
  });

  const utcRecords = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: new Date('2026-04-18T00:00:00Z'),
        lte: new Date('2026-04-18T23:59:59Z')
      }
    },
    include: {
        student: { include: { user: true } }
    }
  });
  console.log('Found records for 04/18/2026 (UTC Day Range):', utcRecords.length);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
