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

    const classes = await prisma.class.findMany({
        where: { schoolId: school.id },
        include: { 
            classSubjects: {
                include: { subject: true }
            },
            _count: {
                select: { students: true }
            }
        }
    });

    console.log('\nClasses and Subjects:');
    for (const cls of classes) {
        const assignmentsCount = await prisma.teacherAssignment.count({
            where: {
                schoolId: school.id,
                classSubject: { classId: cls.id },
                termId: activeTerm?.id || null
            }
        });
        console.log(`${cls.name} ${cls.arm || ''}: ${cls.classSubjects.length} subjects total, ${assignmentsCount} assigned in current term. (${cls._count.students} students)`);
        if (cls.classSubjects.length > assignmentsCount) {
            console.log(`  -> MISSING: ${cls.classSubjects.length - assignmentsCount} assignments`);
        }
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
