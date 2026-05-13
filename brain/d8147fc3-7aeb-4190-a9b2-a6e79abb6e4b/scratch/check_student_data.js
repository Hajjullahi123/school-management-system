const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { admissionNumber: 'DQA/LB/STU/015EQ' },
    include: { classModel: true }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  console.log('Student:', { id: student.id, name: student.name, classId: student.classId, className: student.classModel?.name });

  if (student.classId) {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: student.classId },
      include: { subject: true }
    });
    console.log('Class Subjects Count:', classSubjects.length);
    console.log('Class Subjects:', classSubjects.map(cs => cs.subject.name));
    
    const results = await prisma.result.findMany({
      where: { studentId: student.id, termId: 3 }, // Based on screenshot (Third Term)
    });
    console.log('Results Count:', results.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
