const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log('Schools:', schools);

  for (const school of schools) {
    console.log(`\nChecking school: ${school.name} (ID: ${school.id})`);
    
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId: school.id, isCurrent: true },
      include: { academicSession: true }
    });
    console.log('Active Term:', activeTerm ? `${activeTerm.name} of ${activeTerm.academicSession.name}` : 'NONE');

    const totalAssignments = await prisma.teacherAssignment.count({ where: { schoolId: school.id } });
    console.log('Total Assignments:', totalAssignments);

    const termsWithAssignments = await prisma.teacherAssignment.groupBy({
      by: ['termId'],
      where: { schoolId: school.id },
      _count: { id: true }
    });

    for (const twa of termsWithAssignments) {
        if (twa.termId === null) {
          console.log(`Term ID: NULL: ${twa._count.id} assignments`);
          continue;
        }
        const term = await prisma.term.findUnique({ where: { id: twa.termId }, include: { academicSession: true } });
        console.log(`Term ID ${twa.termId} (${term?.name} ${term?.academicSession?.name}): ${twa._count.id} assignments`);
    }

    const availableTermsToCloneFrom = await prisma.term.findMany({
        where: { schoolId: school.id, isCurrent: false },
        include: { academicSession: true }
    });
    console.log('Available Terms to clone FROM:', availableTermsToCloneFrom.map(t => `${t.name} ${t.academicSession.name} (ID: ${t.id})`));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
