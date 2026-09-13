const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('--- Diagnostic Report ---');
    console.log('Today Date (Server Local):', today.toLocaleString());
    console.log('Today Date (ISO):', today.toISOString());

    // Check school settings for any school
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, staffExpectedArrivalTime: true }
    });
    console.log('\nSchools and Settings:');
    schools.forEach(s => console.log(`- ID: ${s.id}, Name: ${s.name}, Expected Arrival: ${s.staffExpectedArrivalTime}`));

    // Check current user data (Fatima Musa)
    const fatima = await prisma.user.findFirst({
      where: { firstName: 'Fatima', lastName: 'Musa' }
    });

    if (fatima) {
      console.log('\nFound User:', fatima.firstName, fatima.lastName, '(ID:', fatima.id, ')');

      // Check for today's attendance record
      const record = await prisma.staffAttendance.findFirst({
        where: {
          userId: fatima.id,
          date: today
        }
      });

      if (record) {
        console.log('Today\'s Record found:', record);
      } else {
        console.log('No record found for today yet.');
      }

      // Check recent records
      const recent = await prisma.staffAttendance.findMany({
        where: { userId: fatima.id },
        orderBy: { date: 'desc' },
        take: 5
      });
      console.log('\nRecent Attendance Records for Fatima:');
      recent.forEach(r => console.log(`- Date: ${r.date.toISOString()}, Check-in: ${r.checkInTime?.toISOString() || 'N/A'}, Status: ${r.status}`));
    } else {
      console.log('\nUser Fatima Musa not found.');
    }

    // Check for any potential conflicts (multiple records for same day/user/school)
    const allRecords = await prisma.staffAttendance.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    console.log('\nGlobal Recent Staff Attendance:');
    allRecords.forEach(r => console.log(`- ID: ${r.id}, UserID: ${r.userId}, Date: ${r.date.toISOString()}, CreatedAt: ${r.createdAt.toISOString()}`));

  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
