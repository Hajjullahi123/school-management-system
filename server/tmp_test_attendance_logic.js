const prisma = require('./db');

async function test() {
  const schoolId = 1; // Darul Quran? Or use the one from the user's session if I knew it.
  const classId = 1; // Any class
  const targetDate = new Date('2026-03-30'); // A Monday
  const dayOfWeek = targetDate.getDay();

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { weekendDays: true }
  });

  const weekendDaysRaw = school?.weekendDays || "";
  const weekendIndices = weekendDaysRaw.split(',')
    .map(n => n.trim())
    .filter(n => n !== "")
    .map(n => parseInt(n));

  console.log(`School ${schoolId} weekendIndices:`, weekendIndices);
  console.log(`Target Date: ${targetDate.toDateString()} (Day ${dayOfWeek})`);

  let isHoliday = false;
  let holidayInfo = null;

  if (weekendIndices.includes(dayOfWeek)) {
    isHoliday = true;
    holidayInfo = { name: 'Weekend', type: 'weekend' };
  }

  const holidayRecord = await prisma.schoolHoliday.findFirst({
    where: { schoolId: schoolId, date: targetDate }
  });

  console.log('Database Holiday Record:', holidayRecord);

  if (holidayRecord) {
    if (holidayRecord.type === 'weekend') {
      if (weekendIndices.includes(dayOfWeek)) {
        isHoliday = true;
        holidayInfo = { name: holidayRecord.name, type: 'weekend' };
      }
    } else {
      isHoliday = true;
      holidayInfo = holidayRecord;
    }
  }

  console.log('Result:', { isHoliday, holidayInfo });
}

test()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
