const prisma = require('./db');

async function query() {
  const holidays = await prisma.schoolHoliday.findMany({
    include: {
      school: {
        select: { name: true, slug: true, weekendDays: true }
      }
    }
  });
  console.log(JSON.stringify(holidays, null, 2));
  process.exit(0);
}

query();
