const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function checkAllData() {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
        school: { select: { id: true, name: true } }
      }
    });
    console.log(`Total Students: ${students.length}`);
    students.forEach(s => {
      console.log(`Student: ${s.user.firstName} ${s.user.lastName}, School: ${s.school.name} (ID: ${s.school.id}), Admission: ${s.admissionNumber}`);
    });

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      include: {
        school: { select: { name: true, id: true } }
      }
    });
    console.log(`\nTotal Attendance Records: ${attendanceRecords.length}`);
    
    // Group attendance by school
    const attendanceBySchool = {};
    attendanceRecords.forEach(r => {
      if (!attendanceBySchool[r.schoolId]) attendanceBySchool[r.schoolId] = 0;
      attendanceBySchool[r.schoolId]++;
    });
    console.log('Attendance counts per school:', attendanceBySchool);

    // If there are records, show some
    if (attendanceRecords.length > 0) {
      console.log('\nSample Attendance Records (First 5):', JSON.stringify(attendanceRecords.slice(0, 5), null, 2));
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();
