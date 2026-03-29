const prisma = require('./server/db');

async function diagnose() {
  try {
    const school = await prisma.school.findFirst({
      where: { name: { contains: "Darul" } }
    });
    
    if (!school) {
      console.log("School not found");
      return;
    }

    console.log(`School: ${school.name} (ID: ${school.id})`);
    console.log(`Weekend Days Setting: "${school.weekendDays}"`);

    const date = new Date('2026-03-29');
    date.setHours(0, 0, 0, 0);
    
    const holidayRecord = await prisma.schoolHoliday.findFirst({
      where: { schoolId: school.id, date: date }
    });

    console.log(`Holiday record for 2026-03-29:`, holidayRecord ? JSON.stringify(holidayRecord, null, 2) : "NONE");

    // Also check few more dates
    const monday = new Date('2026-03-30');
    monday.setHours(0, 0, 0, 0);
    const mondayRecord = await prisma.schoolHoliday.findFirst({
      where: { schoolId: school.id, date: monday }
    });
    console.log(`Holiday record for 2026-03-30 (Monday):`, mondayRecord ? JSON.stringify(mondayRecord, null, 2) : "NONE");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

diagnose();
