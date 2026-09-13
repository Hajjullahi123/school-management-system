const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: 'admin',
        school: { slug: 'amana-academy' }
      }
    });
    console.log('CHECK_RESULT:' + JSON.stringify({
      found: !!user,
      id: user?.id,
      hashPrefix: user?.passwordHash?.substring(0, 10),
      isActive: user?.isActive
    }));
  } catch (e) {
    console.error('CHECK_ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
