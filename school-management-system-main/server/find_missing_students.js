const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllStudents() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      school: true,
      classModel: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${students.length} total students:`);
  students.forEach(s => {
    console.log(`- ${s.user.firstName} ${s.user.lastName} (ID: ${s.id}): School=${s.school.name} (ID: ${s.schoolId}), Class=${s.classModel?.name} ${s.classModel?.arm} (ID: ${s.classId}), Status=${s.status}, CreatedAt=${s.createdAt}`);
  });

  await prisma.$disconnect();
}

checkAllStudents();
