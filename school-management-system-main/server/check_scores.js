const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const results = await prisma.result.findMany({
    where: { classId: 3, subjectId: 21 },
    select: { studentId: true, assignment1Score: true, assignment2Score: true, test1Score: true, test2Score: true, examScore: true },
    take: 5
  });
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
