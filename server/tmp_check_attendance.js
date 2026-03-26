const prisma = require('./db');

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

    const grouped = await prisma.attendanceRecord.findMany({
      select: { date: true },
      distinct: ['date']
    });
    console.log('\nDistinct Dates Count:', grouped.length);
    grouped.slice(0, 10).forEach(g => {
      console.log(`Date: ${g.date.toISOString()}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendance();
