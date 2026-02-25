const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 3;
  const sessions = await prisma.academicSession.findMany({ where: { schoolId } });
  const terms = await prisma.term.findMany({ where: { schoolId } });
  const classes = await prisma.class.findMany({ where: { schoolId } });
  const subjects = await prisma.subject.findMany({ where: { schoolId } });

  console.log('SESSIONS:', sessions.length);
  console.log('TERMS:', terms.length);
  console.log('CLASSES:', classes.length);
  console.log('SUBJECTS:', subjects.length);

  if (sessions.length > 0) console.log('First Session:', sessions[0].name);
  if (terms.length > 0) console.log('First Term:', terms[0].name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
