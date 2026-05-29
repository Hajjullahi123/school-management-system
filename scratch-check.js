const prisma = require('./server/db');

async function main() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActivated: true,
        websiteTheme: true
      }
    });
    console.log('--- SCHOOLS IN DATABASE ---');
    console.log(JSON.stringify(schools, null, 2));
  } catch (error) {
    console.error('Error fetching schools:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
