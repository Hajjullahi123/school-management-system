const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCounts() {
  const tables = [
    'school', 'academicSession', 'term', 'user', 'class', 'subject',
    'classSubject', 'teacher', 'parent', 'student', 'teacherAssignment',
    'result', 'attendanceRecord', 'feeRecord', 'feePayment', 'miscellaneousFee',
    'staffAttendance', 'homework', 'learningResource', 'notice', 'cbtExam',
    'quranRecord', 'newsEvent', 'galleryImage', 'schoolHoliday'
  ];

  console.log('SUPABASE RECORD COUNTS:');
  console.log('-----------------------');

  for (const table of tables) {
    try {
      const count = await prisma[table].count();
      console.log(`${table.padEnd(25)}: ${count}`);
    } catch (e) {
      console.log(`${table.padEnd(25)}: ERROR (${e.message.split('\n')[0]})`);
    }
  }

  await prisma.$disconnect();
}

checkCounts();
