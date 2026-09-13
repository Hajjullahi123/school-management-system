const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const schools = await prisma.school.findMany({
      where: { name: { contains: 'Amana' } },
      select: { id: true, name: true, slug: true }
    });
    console.log('Schools found:', JSON.stringify(schools, null, 2));

    if (schools.length > 0) {
      const schoolId = schools[0].id;
      const studentCount = await prisma.student.count({ where: { schoolId } });
      const userCount = await prisma.user.count({ where: { schoolId } });
      const feeRecordCount = await prisma.feeRecord.count({ where: { schoolId } });

      const sessionCount = await prisma.academicSession.count({ where: { schoolId } });
      const currentSession = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true }
      });
      const termCount = await prisma.term.count({ where: { schoolId } });
      const currentTerm = await prisma.term.findFirst({
        where: { schoolId, isCurrent: true },
        include: { academicSession: true }
      });

      console.log(`Counts for School ID ${schoolId}:`);
      console.log(`Students: ${studentCount}`);
      console.log(`Users: ${userCount}`);
      console.log(`Fee Records: ${feeRecordCount}`);
      console.log(`Sessions: ${sessionCount}`);
      console.log(`Current Session: ${currentSession ? currentSession.name : 'NONE'}`);
      console.log(`Terms: ${termCount}`);
      console.log(`Current Term: ${currentTerm ? currentTerm.name : 'NONE'}`);

      // Check if there are any sessions/terms at all
      const allSessions = await prisma.academicSession.findMany({ where: { schoolId } });
      const allTerms = await prisma.term.findMany({ where: { schoolId } });

      if (allSessions.length > 0 && !currentSession) {
        console.log('NOTICE: Sessions exist but none are marked isCurrent');
        console.log('Session IDs:', allSessions.map(s => s.id).join(', '));
      }
      if (allTerms.length > 0 && !currentTerm) {
        console.log('NOTICE: Terms exist but none are marked isCurrent');
        console.log('Term IDs:', allTerms.map(t => t.id).join(', '));
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
