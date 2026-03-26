const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttendance() {
  try {
    const records = await prisma.attendanceRecord.findMany({
      take: 20,
      orderBy: { date: 'desc' }
    });
    console.log('Sample Attendance Records:');
    records.forEach(r => {
      console.log(`ID: ${r.id}, StudentID: ${r.studentId}, Date: ${r.date.toISOString()}, Raw Date: ${r.date}`);
    });

    const grouped = await prisma.attendanceRecord.groupBy({
      by: ['date'],
      _count: { id: true }
    });
    console.log('\nGrouped by Date Count:', grouped.length);
    grouped.slice(0, 10).forEach(g => {
      console.log(`Date: ${g.date.toISOString()}, Count: ${g._count.id}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendance();
