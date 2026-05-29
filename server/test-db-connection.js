const prisma = require('./db');

async function main() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActivated: true
      }
    });
    console.log('--- DB SCHOOLS IN DATABASE ---');
    console.log(JSON.stringify(schools, null, 2));
  } catch (error) {
    console.error('Error fetching schools:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
