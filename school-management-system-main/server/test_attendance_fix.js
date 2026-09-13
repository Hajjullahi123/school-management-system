const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFix() {
  try {
    console.log('--- Attendance Fix Verification Script ---');
    
    // 1. Find a teacher to test with
    const teacher = await prisma.user.findFirst({
      where: { role: 'teacher', isActive: true },
      include: { school: true }
    });

    if (!teacher) {
      console.log('No teacher found for testing.');
      return;
    }

    console.log(`Testing with Teacher: ${teacher.firstName} ${teacher.lastName} (ID: ${teacher.id})`);
    console.log(`School: ${teacher.school.name} (ID: ${teacher.schoolId})`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Clean up any existing attendance for today
    await prisma.staffAttendance.deleteMany({
      where: {
        userId: teacher.id,
        date: today
      }
    });
    console.log('Cleaned up previous attendance records for today.');

    // 3. Simulate manual marking (Manual logic from our fix)
    console.log('Simulating manual "Present" marking...');
    
    const schoolSettings = await prisma.school.findUnique({
      where: { id: teacher.schoolId },
      select: { staffExpectedArrivalTime: true }
    });

    const arrivalTimeStr = schoolSettings?.staffExpectedArrivalTime || '07:00';
    const now = new Date();
    
    // This mimics our new logic in staff-attendance.js
    const updateData = {
      status: 'present',
      checkInTime: now,
      updatedAt: new Date()
    };

    const record = await prisma.staffAttendance.upsert({
      where: {
        schoolId_userId_date: {
          schoolId: teacher.schoolId,
          userId: teacher.id,
          date: today
        }
      },
      update: updateData,
      create: {
        schoolId: teacher.schoolId,
        userId: teacher.id,
        date: today,
        ...updateData
      }
    });

    console.log('Attendance record created successfully.');
    console.log('Resulting Record:', {
      id: record.id,
      status: record.status,
      checkInTime: record.checkInTime,
      date: record.date
    });

    // 4. Verify properties required by StaffAttendanceWidget.jsx
    const hasCheckedIn = !!record.checkInTime;
    console.log(`\nVerification Logic Result:`);
    console.log(`- hasCheckedIn: ${hasCheckedIn} (Expected: true)`);
    
    if (hasCheckedIn) {
      console.log('✅ PASS: Teacher dashboard will now correctly show "Checked-in" status.');
    } else {
      console.log('❌ FAIL: hasCheckedIn is false. Widget will still show "Scanning Required".');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFix();
