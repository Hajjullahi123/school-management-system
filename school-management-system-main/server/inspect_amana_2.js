const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const class5Students = await prisma.student.count({ where: { classId: 5 } });
    const class6Students = await prisma.student.count({ where: { classId: 6 } });
    console.log('JSS 3 A (ID 5) Student Count:', class5Students);
    console.log('JSS 3 B (ID 6) Student Count:', class6Students);

    const allCurrentSessions = await prisma.academicSession.findMany({
      where: { isCurrent: true }
    });
    console.log('All Current Sessions:', JSON.stringify(allCurrentSessions.map(s => ({ id: s.id, schoolId: s.schoolId, name: s.name })), null, 2));

    const history = await prisma.promotionHistory.findMany({
      where: { schoolId: 3, type: 'graduation' },
      take: 5
    });
    console.log('Recent Graduation History (Amana):', JSON.stringify(history, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
