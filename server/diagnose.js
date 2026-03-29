const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, weekendDays: true }
  });
  console.log('SCHOOL_DATA_START');
  console.log(JSON.stringify(schools));
  console.log('SCHOOL_DATA_END');
}

main().catch(console.error).finally(() => prisma.$disconnect());
