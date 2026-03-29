const prisma = require('./server/db');

async function checkSchoolConfig() {
  try {
    const school = await prisma.school.findFirst({
      where: { name: { contains: "Darul" } },
      select: { id: true, name: true, weekendDays: true }
    });
    console.log('--- SCHOOL CONFIG START ---');
    console.log(JSON.stringify(school, null, 2));
    console.log('--- SCHOOL CONFIG END ---');
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkSchoolConfig();
