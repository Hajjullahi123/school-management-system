const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, weekendDays: true }
  });

  console.log('--- Schools ---');
  for (const school of schools) {
    console.log(`ID: ${school.id}, Name: ${school.name}, weekendDays: "${school.weekendDays}"`);
    
    const holidays = await prisma.schoolHoliday.findMany({
      where: { schoolId: school.id }
    });
    
    console.log(`  Holidays (${holidays.length}):`);
    holidays.forEach(h => {
      const date = new Date(h.date).toDateString();
      const dayOfWeek = new Date(h.date).getDay();
      console.log(`    - [${h.id}] ${h.name} (${h.type}) on ${date} (Day ${dayOfWeek})`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
