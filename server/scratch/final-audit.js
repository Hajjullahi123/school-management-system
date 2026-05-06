const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            terms: true,
            users: true
          }
        }
      }
    });
    console.log('--- DATABASE DATA REPORT ---');
    console.log(JSON.stringify(schools, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
