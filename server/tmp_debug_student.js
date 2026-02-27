const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const jss2a = await prisma.class.findFirst({
      where: {
        name: { contains: 'JSS 2' },
        arm: { contains: 'A' }
      }
    });

    const sessions = await prisma.academicSession.findMany();
    console.log('\nAcademic Sessions:');
    sessions.forEach(s => {
      console.log(`- ${s.name} (ID: ${s.id}): Current: ${s.isCurrent}`);
    });

    const currentSession = sessions.find(s => s.isCurrent);
    if (currentSession) {
      const termsInCurrent = await prisma.term.findMany({
        where: { academicSessionId: currentSession.id }
      });
      console.log(`\nTerms in Current Session (${currentSession.name}):`);
      termsInCurrent.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
