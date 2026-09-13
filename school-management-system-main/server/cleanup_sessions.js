const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Cleaning Up Duplicate Current Sessions ---');

    // Find all current sessions
    const currentSessions = await prisma.academicSession.findMany({
      where: { isCurrent: true },
      orderBy: { id: 'asc' }
    });

    if (currentSessions.length > 1) {
      console.log(`Found ${currentSessions.length} current sessions. Keeping the first one (ID: ${currentSessions[0].id})...`);

      const sessionIdsToUpdate = currentSessions.slice(1).map(s => s.id);

      await prisma.academicSession.updateMany({
        where: { id: { in: sessionIdsToUpdate } },
        data: { isCurrent: false }
      });

      console.log('Updated duplicate sessions to isCurrent: false.');
    } else {
      console.log('No duplicate current sessions found.');
    }

    console.log('\n--- Cleaning Up Duplicate Current Terms ---');

    const currentTerms = await prisma.term.findMany({
      where: { isCurrent: true },
      orderBy: { id: 'asc' }
    });

    if (currentTerms.length > 1) {
      console.log(`Found ${currentTerms.length} current terms. Keeping the first one (ID: ${currentTerms[0].id})...`);

      const termIdsToUpdate = currentTerms.slice(1).map(t => t.id);

      await prisma.term.updateMany({
        where: { id: { in: termIdsToUpdate } },
        data: { isCurrent: false }
      });

      console.log('Updated duplicate terms to isCurrent: false.');
    } else {
      console.log('No duplicate current terms found.');
    }

    console.log('\n--- Final Status ---');
    const finalSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
    const finalTerm = await prisma.term.findFirst({ where: { isCurrent: true } });

    console.log(`Current Session: ${finalSession ? finalSession.name + ' (ID: ' + finalSession.id + ')' : 'NONE'}`);
    console.log(`Current Term: ${finalTerm ? finalTerm.name + ' (ID: ' + finalTerm.id + ')' : 'NONE'}`);

  } catch (error) {
    console.error('Cleanup Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
