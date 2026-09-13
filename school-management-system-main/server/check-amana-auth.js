const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('--- SCHOOL INFO ---');
    const amana = await prisma.school.findUnique({
      where: { id: 3 },
      include: {
        academicSessions: { where: { isCurrent: true } }
      }
    });
    console.log(JSON.stringify(amana, null, 2));

    console.log('\n--- ADMIN USERS ---');
    const admins = await prisma.user.findMany({
      where: { schoolId: 3, role: 'admin' },
      select: { id: true, username: true, role: true }
    });
    console.log(JSON.stringify(admins, null, 2));

    console.log('\n--- ACTIVE ENROLLMENT ---');
    const studentCount = await prisma.student.count({
      where: { schoolId: 3, status: 'active' }
    });
    console.log('Active Students:', studentCount);

    const classCount = await prisma.class.count({
      where: { schoolId: 3, isActive: true }
    });
    console.log('Active Classes:', classCount);

    console.log('\n--- SESSION/TERM CHECK ---');
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId: 3, isCurrent: true }
    });
    console.log('Current Session:', currentSession ? currentSession.name : 'NONE');

    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: 3, isCurrent: true }
    });
    console.log('Current Term:', currentTerm ? currentTerm.name : 'NONE');

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
