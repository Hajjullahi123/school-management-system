const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const existing = await prisma.result.findFirst({ where: { classId: 3, subjectId: 21 } });
  if (!existing) return;

  const currentAss1 = existing.assignment1Score;

  // Try to update it to null
  const updated = await prisma.result.update({
    where: { id: existing.id },
    data: { assignment1Score: null }
  });

  console.log('Updated to null:', updated.assignment1Score);

  // Revert
  await prisma.result.update({
    where: { id: existing.id },
    data: { assignment1Score: currentAss1 }
  });
}

test().finally(() => prisma.$disconnect());
