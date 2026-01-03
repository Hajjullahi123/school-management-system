const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resultCount = await prisma.result.count();
  const recentResults = await prisma.result.findMany({
    take: 10,
    include: {
      student: { include: { user: true } },
      subject: true,
      term: true,
      academicSession: true
    }
  });

  console.log(`Total Results in DB: ${resultCount}`);
  console.log('Recent 10 Results:');
  recentResults.forEach(r => {
    console.log(`- Student: ${r.student.user.firstName} ${r.student.user.lastName}, Subject: ${r.subject.name}, Score: ${r.totalScore}, Term: ${r.term.name}, Session: ${r.academicSession.name}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
