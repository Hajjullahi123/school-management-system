const prisma = require('./server/db');

async function checkAllSchools() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, weekendDays: true }
    });
    console.log('--- ALL SCHOOLS START ---');
    console.log(JSON.stringify(schools, null, 2));
    console.log('--- ALL SCHOOLS END ---');
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkAllSchools();
