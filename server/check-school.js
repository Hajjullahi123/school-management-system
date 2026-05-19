const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const schools = await prisma.school.findMany({
      where: {
        name: { contains: 'Darul' }
      },
      select: { id: true, name: true, packageType: true }
    });
    console.log(JSON.stringify(schools, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
