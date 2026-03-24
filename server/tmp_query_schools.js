const prisma = require('./db');

async function query() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true, weekendDays: true }
  });
  console.log(JSON.stringify(schools, null, 2));
  process.exit(0);
}

query();
