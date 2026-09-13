const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHolidays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log('Checking for holidays on:', today.toISOString());
  
  const holidays = await prisma.schoolHoliday.findMany({
    where: {
      date: today
    },
    include: {
      school: {
        select: { name: true, slug: true, weekendDays: true }
      }
    }
  });
  
  console.log('Holidays found:', JSON.stringify(holidays, null, 2));
  
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, weekendDays: true }
  });
  
  console.log('All Schools and their weekend settings:');
  schools.forEach(s => {
    console.log(`- ${s.name} (ID: ${s.id}): ${s.weekendDays || '0,6 (Default)'}`);
    const weekendDays = (s.weekendDays || '0,6').split(',').map(d => parseInt(d.trim()));
    const isWeekend = weekendDays.includes(today.getDay());
    console.log(`  Is today a weekend for this school? ${isWeekend}`);
  });

  process.exit(0);
}

checkHolidays();
