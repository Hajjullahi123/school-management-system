const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Manually set the database URL to the one we found
process.env.DATABASE_URL = 'file:./prisma/dev.db';

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
      // Look for school with name containing "Darul" or ID 4 (which we saw earlier)
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

        // Let's check a specific student's attendance in a term
        // Find a term for this school
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
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findSchool();
