const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    where: {
      user: {
        OR: [
          { firstName: 'Adam', lastName: 'Muhammad' },
          { firstName: 'Ahmad', lastName: 'Hamza' }
        ]
      }
    }
  });

  for (const student of students) {
    const results = await prisma.result.findMany({
      where: { studentId: student.id, subjectId: 21 }
    });

    console.log(`Basic Science (21) for ${student.id} (${student.admissionNumber}):`);
    results.forEach(r => {
      console.log(`  Ass1=${r.assignment1Score}, Ass2=${r.assignment2Score}, Test1=${r.test1Score}, Test2=${r.test2Score}, Exam=${r.examScore}`);
    });
  }
}

run().finally(() => prisma.$disconnect());
