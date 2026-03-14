const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findFirst({
      where: { username: 'fatima.musa' },
      include: { school: true }
    });
    if (user) {
      console.log('USER_FOUND:', user.username, 'SCHOOL:', user.school?.name, 'ID:', user.school?.id);
    } else {
      console.log('USER_NOT_FOUND');
    }
  } catch (e) {
    console.error('DB ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

check();
