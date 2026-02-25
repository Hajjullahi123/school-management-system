const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const school = await prisma.school.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        isActivated: true,
        expiresAt: true,
        subscriptionActive: true,
        packageType: true
      }
    });

    console.log('School Subscription State:', JSON.stringify(school, null, 2));

    if (school.expiresAt && new Date(school.expiresAt) < new Date()) {
      console.log('LOGIC: This school would be considered EXPIRED.');
    } else if (school.expiresAt === null) {
      console.log('LOGIC: expiresAt is NULL. Checking behavior...');
      console.log('new Date(null):', new Date(null));
      console.log('new Date(null) < new Date():', new Date(null) < new Date());
    } else {
      console.log('LOGIC: This school is NOT expired.');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
