const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('--- Checking Classes 1, 3, 5 ---');
    const classes = await prisma.class.findMany({
      where: { id: { in: [1, 3, 5] } },
      select: { id: true, name: true, schoolId: true }
    });
    console.log(JSON.stringify(classes, null, 2));

    console.log('\n--- Checking Classes owned by School 3 ---');
    const amanaClasses = await prisma.class.findMany({
      where: { schoolId: 3 },
      select: { id: true, name: true, arm: true, isActive: true }
    });
    console.log(JSON.stringify(amanaClasses, null, 2));

    console.log('\n--- Checking School 5 (Demo Academy) presence ---');
    const demoAcademy = await prisma.school.findUnique({ where: { id: 5 } });
    console.log('School 5:', demoAcademy ? demoAcademy.name : 'Not found');

    const demoClasses = await prisma.class.findMany({
      where: { schoolId: 5 },
      select: { id: true, name: true, arm: true }
    });
    console.log('School 5 Classes:', JSON.stringify(demoClasses, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
