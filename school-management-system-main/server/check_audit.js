const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      resource: 'CLASS',
      action: 'DELETE'
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- Recent Class Deactivations ---');
  console.log(JSON.stringify(logs, null, 2));

  const jss2a = await prisma.class.findFirst({
    where: { name: 'JSS 2', arm: 'A' }
  });
  console.log('\n--- JSS 2 A Status ---');
  console.log(JSON.stringify(jss2a, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
