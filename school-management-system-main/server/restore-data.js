const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreData() {
  console.log('--- Starting Data Restoration to Local SQLite ---');
  
  const dumpPath = path.join(__dirname, 'data-dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error(`Error: Dump file not found at ${dumpPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  // Order matters for foreign keys
  const models = [
    'globalSettings', 'school', 'user', 'parent', 'student', 'teacher',
    'teacherAvailability', 'academicSession', 'term', 'class', 'resultPublication',
    'subject', 'classSubject', 'teacherAssignment', 'result', 'attendanceRecord',
    'staffAttendance', 'schoolHoliday', 'timetable', 'notice', 'homework',
    'homeworkSubmission', 'learningResource', 'feeRecord', 'feePayment', 'examCard',
    'classFeeStructure', 'license', 'onlinePayment', 'auditLog'
  ];

  console.log('Cleaning up existing data...');
  const reverseModels = [...models].reverse();
  for (const model of reverseModels) {
    try {
      await prisma[model].deleteMany();
    } catch (e) {}
  }

  for (const model of models) {
    if (data[model] && data[model].length > 0) {
      console.log(`Restoring ${model} (${data[model].length} records)...`);
      
      for (const item of data[model]) {
        try {
          await prisma[model].create({ data: item });
        } catch (itemErr) {
          console.warn(`  Failed item in ${model} (ID: ${item.id}): ${itemErr.message.split('\n')[0]}`);
        }
      }
    }
  }

  console.log('\n🎉 Restoration complete!');
  await prisma.$disconnect();
}

restoreData().catch(e => {
  console.error('Fatal restoration error:', e);
  process.exit(1);
});
