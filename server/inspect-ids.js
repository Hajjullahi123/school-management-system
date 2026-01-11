const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const users = await prisma.user.findMany({
      where: { username: 'admin' },
      select: { id: true, username: true, schoolId: true }
    });
    console.log('--- ADMIN USERS ---');
    console.log(JSON.stringify(users, null, 2));

    const schools = await prisma.school.findMany({
      select: { id: true, name: true, logoUrl: true }
    });
    console.log('--- ALL SCHOOLS ---');
    console.log(JSON.stringify(schools, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
