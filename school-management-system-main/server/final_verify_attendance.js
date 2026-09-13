const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fatima Musa ID is 75, schoolId 3
    const userId = "75";
    const schoolId = "3";

    console.log('--- FINAL VERIFICATION ---');
    console.log(`Testing with String IDs: schoolId="${schoolId}", userId="${userId}"`);

    // Cast as done in the routes
    const sId = parseInt(schoolId);
    const uId = parseInt(userId);

    console.log(`Casted IDs: sId=${sId} (${typeof sId}), uId=${uId} (${typeof uId})`);

    // Test findUnique
    console.log('\nTesting findUnique...');
    const record = await prisma.staffAttendance.findUnique({
      where: {
        schoolId_userId_date: {
          schoolId: sId,
          userId: uId,
          date: today
        }
      }
    });
    console.log('findUnique success:', !!record);

    // Test upsert
    console.log('\nTesting upsert...');
    const updated = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId: sId,
          userId: uId,
          date: today
        }
      },
      update: { status: 'present' },
      create: {
        schoolId: sId,
        userId: uId,
        date: today,
        status: 'present'
      }
    });
    console.log('upsert success, ID:', updated.id);

    console.log('\n--- VERIFICATION COMPLETE ---');

  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
