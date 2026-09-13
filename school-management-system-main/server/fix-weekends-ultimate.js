const prisma = require('./db');

async function fixWeekends() {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, weekendDays: true }
  });

  console.log(`Analyzing ${schools.length} schools...`);

  for (const school of schools) {
    const weekendDaysRaw = school?.weekendDays || "";
    const weekendIndices = weekendDaysRaw.split(',')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(n => parseInt(n));

    console.log(`School: ${school.name} (ID: ${school.id}) - Weekend Indices: [${weekendIndices}]`);

    // Find all potential stale records: type 'weekend' OR name is a day of the week
    const potentialStale = await prisma.schoolHoliday.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { type: 'weekend' },
          { name: { in: dayNames } }
        ]
      }
    });

    let deletedCount = 0;
    for (const record of potentialStale) {
      // Use getUTCDay for consistency with how we store UTC midnights
      const dayOfWeek = new Date(record.date).getUTCDay();
      
      // If it's not a configured weekend day, it's stale.
      if (!weekendIndices.includes(dayOfWeek)) {
        await prisma.schoolHoliday.delete({
          where: { id: record.id }
        });
        deletedCount++;
        console.log(`  Deleted: "${record.name}" on ${record.date.toISOString()} (Day ${dayOfWeek})`);
      }
    }

    if (deletedCount > 0) {
      console.log(`  Cleaned up ${deletedCount} stale records for ${school.name}.`);
    } else {
      console.log(`  No stale records found for ${school.name}.`);
    }
  }

  console.log("Ultimate Weekend Fix Complete.");
}

fixWeekends()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
