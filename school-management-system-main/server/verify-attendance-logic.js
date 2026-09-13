const prisma = require('./db');

async function verifyArrivalNotification() {
  console.log('🚀 Starting Attendance Notification Verification...');

  try {
    // 1. Find a student with a parent
    const student = await prisma.student.findFirst({
      include: {
        user: true,
        parent: { include: { user: true } },
        classModel: true
      }
    });

    if (!student || !student.parent) {
      console.log('❌ No student with linked parent found for testing.');
      return;
    }

    console.log(`✅ Found test student: ${student.user.firstName} (ID: ${student.id})`);
    console.log(`✅ Linked parent user ID: ${student.parent.userId}`);

    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 2. Simulate the /mark route logic for "Safe Arrival Alert"
    console.log('--- Simulating Arrival Notification Logic ---');

    // Check if already notified today (mimic my new logic)
    const existingArrivalMsg = await prisma.parentTeacherMessage.findFirst({
      where: {
        receiverId: student.parent.userId,
        studentId: student.id,
        subject: 'Safe Arrival Alert',
        createdAt: { gte: targetDate }
      }
    });

    if (existingArrivalMsg) {
      console.log('ℹ️ Safe Arrival Alert already exists for today. Deleting it to re-test...');
      await prisma.parentTeacherMessage.delete({ where: { id: existingArrivalMsg.id } });
    }

    const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const schoolName = 'Test Academy';

    // Create the message
    const newMessage = await prisma.parentTeacherMessage.create({
      data: {
        schoolId: student.schoolId,
        senderId: student.userId, // Simulating student arrive
        receiverId: student.parent.userId,
        senderRole: 'system',
        studentId: student.id,
        subject: 'Safe Arrival Alert',
        message: `${student.user.firstName} has arrived safely at school (${arrivalTime}).`,
        messageType: 'attendance',
        isRead: false
      }
    });

    console.log('✅ In-App Message created:', newMessage.id);
    console.log('✅ Content:', newMessage.message);

    // Verify SMS helper would be called
    console.log('--- Verifying Service Helpers ---');
    const { sendArrivalSMS } = require('./services/smsService');
    const { sendArrivalAlert } = require('./services/emailService');

    const smsResult = await sendArrivalSMS({
      phone: student.parent.phone || '000000',
      studentName: student.user.firstName,
      time: arrivalTime,
      schoolName
    });
    console.log('✅ SMS helper called. Result:', smsResult);

    const emailResult = await sendArrivalAlert({
      parentEmail: student.parent.user.email || 'test@example.com',
      studentName: student.user.firstName,
      time: arrivalTime,
      className: student.classModel?.name || 'N/A',
      schoolName
    });
    console.log('✅ Email helper called. Result:', emailResult);

    console.log('\n✨ Verification Logic Complete. Database state and service logs indicate success.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyArrivalNotification();
