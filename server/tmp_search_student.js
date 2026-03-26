const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function searchStudent() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'UMMULKHAIRI' } },
          { lastName: { contains: 'UMMULKHAIRI' } },
          { firstName: { contains: 'Hauwa' } }
        ]
      },
      include: {
        school: true,
        student: {
          include: {
            classModel: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`User: ${u.firstName} ${u.lastName} (ID: ${u.id})`);
      console.log(`  School: ${u.school?.name} (ID: ${u.schoolId})`);
      if (u.student) {
        console.log(`  Student ID: ${u.student.id}, Admission: ${u.student.admissionNumber}`);
        console.log(`  Class: ${u.student.classModel?.name} ${u.student.classModel?.arm || ''} (ID: ${u.student.classId})`);
      }
    });

    if (users.length > 0 && users[0].student) {
        const studentId = users[0].student.id;
        const schoolId = users[0].schoolId;
        const attendance = await prisma.attendanceRecord.findMany({
            where: { studentId: studentId }
        });
        console.log(`\nAttendance records for student ${studentId}: ${attendance.length}`);
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

searchStudent();
