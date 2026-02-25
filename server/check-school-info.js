const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const school = await prisma.school.findUnique({
      where: { id: 3 }
    });
    console.log('School Info:', JSON.stringify(school, null, 2));

    const globalSettings = await prisma.globalSettings.findFirst();
    console.log('Global Settings:', JSON.stringify(globalSettings, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
