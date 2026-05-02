const prisma = require('./db');
async function test() {
  try {
    const user = await prisma.user.findFirst({ where: { firstName: 'Abdullahi', lastName: 'Lawal' }});
    if(!user) return;
    
    // Unread count
    const unreadCount = await prisma.parentTeacherMessage.count({
      where: { receiverId: user.id, isRead: false, schoolId: user.schoolId }
    });
    console.log('Unread:', unreadCount);
    
    // Quran check
    const studentClassId = null;
    const quranAssignment = await prisma.teacherAssignment.findFirst({
            where: {
              teacherId: user.id,
              schoolId: user.schoolId,
              classSubject: {
                subject: {
                  name: { contains: 'quran' }
                }
              }
            },
            select: { id: true }
    });
    console.log('Success, no errors thrown.');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
