const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const s = await prisma.school.findUnique({ where: { id: 3 } });
    console.log('School:', JSON.stringify(s, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
