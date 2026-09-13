const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 3;
  const terms = await prisma.term.findMany({
    where: { schoolId },
    include: { academicSession: true }
  });

  console.log(`Found ${terms.length} terms for school ${schoolId}:`);
  terms.forEach(t => {
    console.log(`Term: ${t.name} (ID: ${t.id}), Session: ${t.academicSession?.name} (ID: ${t.academicSessionId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
