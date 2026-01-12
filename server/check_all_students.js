const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllStudents() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      classModel: {
        select: { name: true, arm: true, id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  console.log('Last 50 Added Students:');
  students.forEach(s => {
    console.log(`- ${s.user.firstName} ${s.user.lastName} (ID: ${s.id}): Class=${s.classModel ? s.classModel.name + ' ' + (s.classModel.arm || '') : 'NONE'} (ID: ${s.classId}), Status=${s.status}, CreatedAt=${s.createdAt}`);
  });

  await prisma.$disconnect();
}

checkAllStudents();
