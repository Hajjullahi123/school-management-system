const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 4;
  const sessions = await prisma.academicSession.findMany({ where: { schoolId } });
  const terms = await prisma.term.findMany({ where: { schoolId } });

  console.log(`--- School ${schoolId} ---`);
  console.log('Sessions:', sessions);
  console.log('Terms:', terms);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
