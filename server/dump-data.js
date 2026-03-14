const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function dumpData() {
  console.log('--- Starting Data Dump from Supabase ---');
  
  // List of models to dump (excluding logs if they are too big, but let's try all first)
  const models = [
    'globalSettings', 'school', 'auditLog', 'user', 'parent', 'student', 'teacher',
    'teacherAvailability', 'academicSession', 'term', 'class', 'resultPublication',
    'subject', 'classSubject', 'teacherAssignment', 'result', 'attendanceRecord',
    'staffAttendance', 'schoolHoliday', 'timetable', 'notice', 'homework',
    'homeworkSubmission', 'learningResource', 'feeRecord', 'feePayment', 'examCard',
    'classFeeStructure', 'license', 'onlinePayment'
  ];

  const data = {};

  for (const model of models) {
    try {
      console.log(`Dumping ${model}...`);
      data[model] = await prisma[model].findMany();
    } catch (err) {
      console.warn(`Failed to dump ${model}: ${err.message}`);
    }
  }

  const dumpPath = path.join(__dirname, 'data-dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
  console.log(`\n🎉 Dump complete! Saved to ${dumpPath}`);
  
  await prisma.$disconnect();
}

dumpData().catch(e => {
  console.error('Fatal dump error:', e);
  process.exit(1);
});
