const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({
    where: { role: 'student' },
    include: { student: true }
  });

  if (student) {
    console.log('Student Found:');
    console.log(`Username: ${student.username}`);
    console.log(`Name: ${student.firstName} ${student.lastName}`);
    console.log(`Admission Number: ${student.student?.admissionNumber}`);
    console.log('Default Password: "123456" (unless changed)');
  } else {
    console.log('No student found in the database.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
