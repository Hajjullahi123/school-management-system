
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('DATABASE_URL from env:', process.env.DATABASE_URL);

    const schools = await prisma.school.count();
    const users = await prisma.user.count();
    const students = await prisma.student.count();

    console.log('--- DATABASE STATUS ---');
    console.log('Schools:', schools);
    console.log('Users:', users);
    console.log('Students:', students);

    if (schools > 0) {
      const firstSchool = await prisma.school.findFirst();
      console.log('First School Name:', firstSchool.name);
    }

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
