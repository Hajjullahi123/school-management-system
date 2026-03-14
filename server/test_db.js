const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.result.findFirst({
    where: { assignment1Score: 0 }
  });
  console.log('Result with 0:', result);
}

main().finally(() => prisma.$disconnect());
