const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessions() {
  const schoolId = 3;
  const sessions = await prisma.academicSession.findMany({
    where: { schoolId }
  });
  console.log('Academic Sessions for School 3:', sessions);

  const currentTerm = await prisma.term.findFirst({
    where: { schoolId, isCurrent: true },
    include: { academicSession: true }
  });
  console.log('Current Term Info:', currentTerm);

  await prisma.$disconnect();
}

checkSessions();
