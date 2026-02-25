const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findGarbage() {
  try {
    const questions = await prisma.cBTQuestionBank.findMany({
      include: {
        subject: true,
        teacher: true
      }
    });

    const validOptions = ['a', 'b', 'c', 'd'];
    const garbage = questions.filter(q => !validOptions.includes((q.correctOption || '').toLowerCase()));

    console.log(`Total questions in bank: ${questions.length}`);
    console.log(`Potential garbage questions found: ${garbage.length}`);

    if (garbage.length > 0) {
      console.log('\nSample Garbage Entries:');
      garbage.slice(0, 10).forEach(q => {
        console.log(`- ID: ${q.id}, Question: "${q.questionText.substring(0, 30)}...", Correct: "${q.correctOption}", Subject: ${q.subject?.name}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findGarbage();
