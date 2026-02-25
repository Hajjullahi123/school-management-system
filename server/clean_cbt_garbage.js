const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanGarbage() {
  try {
    const validOptions = ['a', 'b', 'c', 'd'];

    // Find count first
    const questions = await prisma.cBTQuestionBank.findMany();
    const toDelete = questions.filter(q => !validOptions.includes((q.correctOption || '').toLowerCase()));
    const idsToDelete = toDelete.map(q => q.id);

    console.log(`Found ${idsToDelete.length} garbage entries to delete.`);

    if (idsToDelete.length > 0) {
      const result = await prisma.cBTQuestionBank.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
      console.log(`Successfully deleted ${result.count} entries.`);
    } else {
      console.log('No garbage entries found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanGarbage();
