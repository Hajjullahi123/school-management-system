const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: {
      user: {
        select: {
          username: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  console.log('=== STUDENTS IN SYSTEM ===');
  console.log(`Total students: ${students.length}\n`);

  students.forEach((student, index) => {
    console.log(`Student ${index + 1}:`);
    console.log(`  Name: ${student.user.firstName} ${student.user.lastName}`);
    console.log(`  Username: ${student.user.username}`);
    console.log(`  Admission Number: ${student.admissionNumber}`);
    console.log(`  Default Password: 123456`);
    console.log('');
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
