const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const amana = await prisma.school.findFirst({
    where: { name: { contains: 'Amana' } }
  });
  console.log('Amana Academy Principal Signature:', amana?.principalSignatureUrl ? 'EXISTS' : 'NULL');
}

main().catch(console.error).finally(() => prisma.$disconnect());
