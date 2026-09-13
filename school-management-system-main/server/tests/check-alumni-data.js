const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Alumni Data ---');
  const students = await prisma.student.findMany({
    where: { status: 'alumni' },
    include: { user: true },
    take: 10
  });

  if (students.length === 0) {
    console.log('No alumni found.');
  } else {
    students.forEach(s => {
      console.log(`Student ID: ${s.id}`);
      console.log(`  Name: ${s.user.firstName} ${s.user.middleName || '(no middle name)'} ${s.user.lastName}`);
      console.log(`  Photo URL: ${s.photoUrl || '(no photo)'}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
