const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upgrade() {
  try {
    const updated = await prisma.school.update({
      where: { id: 4 },
      data: {
        packageType: 'premium',
        isActivated: true,
        subscriptionActive: true,
        expiresAt: new Date('2028-01-01') // Long term for testing/premium access
      }
    });
    console.log('School upgraded successfully:');
    console.log(JSON.stringify(updated, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

upgrade();
