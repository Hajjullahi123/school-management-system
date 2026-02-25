const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTypes() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simulate req.schoolId and req.user.id coming from JWT (often strings)
    const schoolId = "3"; // Amana
    const userId = "75";   // Fatima Musa

    console.log(`Testing with String IDs: schoolId="${schoolId}" (${typeof schoolId}), userId="${userId}" (${typeof userId})`);

    // 1. Test findUnique for School
    console.log('\n1. testing school.findUnique...');
    try {
      const school = await prisma.school.findUnique({
        where: { id: schoolId }
      });
      console.log('School findUnique result:', school?.name || 'Not found');
    } catch (e) {
      console.error('School findUnique FAILED:', e.message);
    }

    // 2. Test staffAttendance.findUnique
    console.log('\n2. testing staffAttendance.findUnique...');
    try {
      const existing = await prisma.staffAttendance.findUnique({
        where: {
          schoolId_userId_date: {
            schoolId: schoolId,
            userId: userId,
            date: today
          }
        }
      });
      console.log('StaffAttendance findUnique result found:', !!existing);
    } catch (e) {
      console.error('StaffAttendance findUnique FAILED:', e.message);
    }

    // 3. Test upsert with strings
    console.log('\n3. testing staffAttendance.upsert...');
    try {
      const record = await prisma.staffAttendance.upsert({
        where: {
          schoolId_userId_date: {
            schoolId: schoolId,
            userId: userId,
            date: today
          }
        },
        update: { status: 'present' },
        create: {
          schoolId: schoolId,
          userId: userId,
          date: today,
          status: 'present'
        }
      });
      console.log('Upsert successful');
    } catch (e) {
      console.error('Upsert FAILED:', e.message);
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTypes();
