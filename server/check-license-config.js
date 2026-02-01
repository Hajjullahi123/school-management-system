const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Global Settings ---');
    const settings = await prisma.globalSettings.findFirst();
    console.log(JSON.stringify(settings, null, 2));

    console.log('\n--- Recent Licenses ---');
    const licenses = await prisma.license.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(licenses, null, 2));

    console.log('\n--- Schools (License Info) ---');
    const schools = await prisma.school.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        licenseKey: true,
        isActivated: true,
        packageType: true,
        expiresAt: true
      }
    });
    console.log(JSON.stringify(schools, null, 2));

  } catch (error) {
    console.error('Error during check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
