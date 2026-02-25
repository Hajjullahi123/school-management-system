const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestResults(studentId) {
  console.log(`Seeding results for Student ${studentId}...`);
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true }
    });

    if (!student) throw new Error(`Student ${studentId} not found`);
    const schoolId = student.schoolId;

    // Find a session that HAS terms
    const sessions = await prisma.academicSession.findMany({
      where: { schoolId },
      include: { terms: { take: 1 } }
    });

    const session = sessions.find(s => s.terms.length > 0);
    if (!session) throw new Error('No session with terms found');
    console.log(`Using session: ${session.name} (ID: ${session.id})`);

    const term = await prisma.term.findFirst({ where: { schoolId, academicSessionId: session.id } });
    console.log(`Using term: ${term.name} (ID: ${term.id})`);

    const classModel = await prisma.class.findFirst({ where: { schoolId } });
    const subjects = await prisma.subject.findMany({ where: { schoolId }, take: 5 });

    for (let i = 0; i < subjects.length; i++) {
      const sub = subjects[i];
      await prisma.result.upsert({
        where: {
          schoolId_studentId_subjectId_termId_academicSessionId: {
            schoolId: schoolId,
            studentId,
            academicSessionId: session.id,
            termId: term.id,
            subjectId: sub.id
          }
        },
        update: {
          totalScore: 70 + (i * 5),
          grade: i === 0 ? 'A' : (i < 3 ? 'B' : 'C'),
          isSubmitted: true,
          classId: classModel.id,
          schoolId: schoolId
        },
        create: {
          schoolId: schoolId,
          studentId,
          academicSessionId: session.id,
          termId: term.id,
          classId: classModel.id,
          subjectId: sub.id,
          totalScore: 70 + (i * 5),
          grade: i === 0 ? 'A' : (i < 3 ? 'B' : 'C'),
          isSubmitted: true
        }
      });
    }

    console.log(`SUCCESS: Seeded results for ${subjects.length} subjects.`);

  } catch (error) {
    console.error('FAIL:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestResults(1);
