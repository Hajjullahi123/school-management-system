const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resultBatch = await prisma.result.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  const oldestBatch = await prisma.result.findMany({
    take: 10,
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });

  console.log('Most Recent 10 Results (Created At):');
  resultBatch.forEach(r => console.log(r.createdAt));

  console.log('\nOldest 10 Results (Created At):');
  oldestBatch.forEach(r => console.log(r.createdAt));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
