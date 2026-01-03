const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      schoolId: true
    }
  });
  console.log('Current Users:');
  console.table(users);

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  console.log('Current Schools:');
  console.table(schools);

  await prisma.$disconnect();
}

checkUsers();
