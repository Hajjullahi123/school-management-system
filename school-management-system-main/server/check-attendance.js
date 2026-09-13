const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      attendanceRecords: {
        orderBy: { date: 'desc' },
        take: 5
      }
    }
  });

  const bulama = students.find(s => s.user.firstName === 'Lamin' || s.name?.includes('Lamin'));
  if (!bulama) { console.log('Lamin Bulama not found'); return; }

  console.log('Total Attendance Records for Lamin:', bulama.attendanceRecords.length);
  if (bulama.attendanceRecords.length > 0) {
    console.log('Most recent records:');
    bulama.attendanceRecords.forEach(r => {
      console.log(`- Date: ${r.date}, Status: ${r.status}`);
    });
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
