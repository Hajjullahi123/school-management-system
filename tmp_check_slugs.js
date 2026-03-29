const prisma = require('./server/db');

async function checkSlugs() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true, weekendDays: true }
    });
    console.log('--- SCHOOL SLUGS AND SETTINGS ---');
    console.log(JSON.stringify(schools, null, 2));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkSlugs();
