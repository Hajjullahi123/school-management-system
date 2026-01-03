const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Debugging Classes ---');
  const classes = await prisma.class.findMany({
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Found ${classes.length} classes:`);
  console.log('ID | Name | Arm | Students Count');
  console.log('---|---|---|---');
  for (const cls of classes) {
    console.log(`${cls.id} | ${cls.name} | ${cls.arm || '-'} | ${cls._count.students}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
