const prisma = require('./db');

async function add() {
  const result = await prisma.schoolHoliday.upsert({
    where: { schoolId_date: { schoolId: 4, date: new Date('2026-03-24T00:00:00Z') } },
    update: { name: 'Test Holiday', type: 'holiday' },
    create: { schoolId: 4, date: new Date('2026-03-24T00:00:00Z'), name: 'Test Holiday', type: 'holiday' }
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

add();
