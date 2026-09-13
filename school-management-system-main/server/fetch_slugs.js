const prisma = require('./db');

async function getSlugs() {
  try {
    const schools = await prisma.school.findMany({
      select: { name: true, slug: true, isActivated: true }
    });
    console.log(JSON.stringify(schools, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

getSlugs();
