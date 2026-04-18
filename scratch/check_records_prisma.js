const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.attendanceRecord.findMany({
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
  console.log('Found records for 04/18/2026:', records.length);
  records.forEach(r => {
    console.log(`Student: ${r.student.user.firstName} ${r.student.user.lastName}, Status: [${r.status}], Date: ${r.date.toISOString()}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
