const prisma = require('./db');

async function findSchool() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('Schools:', JSON.stringify(schools, null, 2));

    const attendanceCount = await prisma.attendanceRecord.count();
    console.log('Total Attendance Records in DB:', attendanceCount);

    if (schools.length > 0) {
      const darul = schools.find(s => s.name.toLowerCase().includes('darul'));
      if (darul) {
        const records = await prisma.attendanceRecord.findMany({
          where: { schoolId: darul.id },
          take: 10,
          orderBy: { date: 'desc' }
        });
        console.log(`\nAttendance for ${darul.name}:`, JSON.stringify(records, null, 2));
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findSchool();
