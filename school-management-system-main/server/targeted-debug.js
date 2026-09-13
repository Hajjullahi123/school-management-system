const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 3;
  try {
    const term = await prisma.term.findFirst({
      where: { schoolId, name: { contains: 'Second Term' } },
      include: { academicSession: true }
    });
    console.log('Term:', term?.id, term?.name);

    const cls = await prisma.class.findFirst({
      where: { schoolId, name: { contains: 'الركن الثاني أ' } }
    });
    console.log('Class:', cls?.id, cls?.name);

    if (term && cls) {
      // Test the bulk fetch logic
      const students = await prisma.student.findMany({
        where: { classId: cls.id, schoolId, status: 'active' },
        include: { user: true }
      });
      console.log('Students:', students.length);

      const allResults = await prisma.result.findMany({
        where: { 
          studentId: { in: students.map(s => s.id) }, 
          termId: term.id, 
          schoolId 
        },
        include: { subject: true }
      });
      console.log('Results:', allResults.length);

      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: cls.id, schoolId },
        include: { subject: true }
      });
      console.log('Class Subjects:', classSubjects.length);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
