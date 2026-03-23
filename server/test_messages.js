const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Just try to fetch from the table
    const count = await prisma.parentTeacherMessage.count();
    console.log('Current message count:', count);
    
    // Try to find a school and user to create a test message
    const school = await prisma.school.findFirst();
    const user = await prisma.user.findFirst({ where: { schoolId: school.id } });
    
    if (school && user) {
      console.log('Creating test message...');
      const msg = await prisma.parentTeacherMessage.create({
        data: {
          schoolId: school.id,
          senderId: user.id,
          receiverId: user.id, // Self message for test
          senderRole: user.role,
          studentId: 0, // dummy
          subject: 'Test Subject',
          message: 'Test Message',
          updatedAt: new Date()
        }
      });
      console.log('Test message created:', msg.id);
      
      // Cleanup
      await prisma.parentTeacherMessage.delete({ where: { id: msg.id } });
      console.log('Test message deleted.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
