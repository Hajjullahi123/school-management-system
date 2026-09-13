const prisma = require('./db');
async function checkCounts() {
  const studentCount = await prisma.student.count();
  const classCount = await prisma.class.count();
  const resultCount = await prisma.result.count();
  const alumniCount = await prisma.alumni.count();
  console.log('--- DB Stats ---');
  console.log('Students:', studentCount);
  console.log('Classes:', classCount);
  console.log('Results:', resultCount);
  console.log('Alumni:', alumniCount);
  process.exit(0);
}
checkCounts();
