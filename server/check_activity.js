const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentActivity() {
  const schoolId = 3;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      createdAt: { gte: today }
    },
    include: { user: true, classModel: true }
  });

  console.log(`Found ${students.length} students created today in School 3:`);
  students.forEach(s => {
    console.log(`- ${s.user.firstName} ${s.user.lastName} (ID: ${s.id}) Class ID: ${s.classId} (${s.classModel?.name})`);
  });

  const allRecords = await prisma.feeRecord.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\nLast 10 Fee Records in School 3:');
  allRecords.forEach(r => {
    console.log(`- ID: ${r.id}, Student ID: ${r.studentId}, Term ID: ${r.termId}, Expected: ${r.expectedAmount}, CreatedAt: ${r.createdAt}`);
  });

  await prisma.$disconnect();
}

checkRecentActivity();
