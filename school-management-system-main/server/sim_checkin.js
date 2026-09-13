const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateCheckIn() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fatima Musa is ID 65 based on previous list (or I can find her again)
    const user = await prisma.user.findFirst({
      where: { firstName: 'Fatima', lastName: 'Musa' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Simulating check-in for:', user.firstName, user.lastName, 'ID:', user.id);
    console.log('Date:', today.toISOString());

    const checkInTime = new Date();
    const status = 'present';
    const lateMinutes = 0;

    const record = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId: user.schoolId,
          userId: user.id,
          date: today
        }
      },
      update: {
        checkInTime,
        status,
        lateMinutes
      },
      create: {
        schoolId: user.schoolId,
        userId: user.id,
        date: today,
        checkInTime,
        status,
        lateMinutes
      }
    });

    console.log('Upsert successful:', record);

  } catch (error) {
    console.error('SIMULATION ERROR:', error);
    if (error.code) console.error('Error Code:', error.code);
    if (error.meta) console.error('Error Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

simulateCheckIn();
