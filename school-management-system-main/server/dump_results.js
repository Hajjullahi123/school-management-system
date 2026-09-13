const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const student = await prisma.student.findFirst({
    where: { user: { firstName: 'Abubakar', lastName: 'Juli' } }
  });

  if (!student) {
    console.log("Student not found");
    return;
  }

  const results = await prisma.result.findMany({
    where: { studentId: student.id }
  });

  console.log(`Results for ${student.id} (${student.admissionNumber}):`);
  results.forEach(r => {
    console.log(`Subject ${r.subjectId}: Ass1=${r.assignment1Score}, Ass2=${r.assignment2Score}, Test1=${r.test1Score}, Test2=${r.test2Score}, Exam=${r.examScore}, Term=${r.termId}, Session=${r.academicSessionId}, Class=${r.classId}`);
  });
}

run().finally(() => prisma.$disconnect());
