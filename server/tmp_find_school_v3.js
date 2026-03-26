const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Use absolute path for the SQLite database
const dbPath = path.resolve(__dirname, 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

console.log('Connecting to database at:', dbPath);

const prisma = new PrismaClient();

async function findSchool() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('Schools:', JSON.stringify(schools, null, 2));

    const attendanceCount = await prisma.attendanceRecord.count();
    console.log('Total Attendance Records in DB:', attendanceCount);

    if (schools.length > 0) {
      const darul = schools.find(s => s.id === 4 || s.slug === 'darul-quran');
      if (darul) {
        console.log(`\nChecking attendance for School ID ${darul.id} (${darul.name})...`);
        const records = await prisma.attendanceRecord.findMany({
          where: { schoolId: darul.id },
          take: 10,
          orderBy: { date: 'desc' },
          include: { class: true }
        });
        console.log(`Sample Attendance Records:`, JSON.stringify(records, null, 2));

        const term = await prisma.term.findFirst({
           where: { schoolId: darul.id, isCurrent: true }
        });

        if (term && records.length > 0) {
          const classId = records[0].classId;
          const classAttendanceDays = await prisma.attendanceRecord.groupBy({
            by: ['date'],
            where: {
              schoolId: darul.id,
              classId: classId,
              termId: term.id
            }
          });
          console.log(`\nClass ID ${classId} has ${classAttendanceDays.length} distinct attendance dates in current term.`);
          classAttendanceDays.forEach(d => console.log(`Date: ${d.date.toISOString()}`));
        }
      }
    }

  } catch (e) {
    console.error('Error during database operation:', e);
  } finally {
    await prisma.$disconnect();
  }
}

findSchool();
