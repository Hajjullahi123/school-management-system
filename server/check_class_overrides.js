const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { reportLayout: { not: null } },
        { showPositionOnReport: false },
        { showFeesOnReport: false }
      ]
    },
    select: {
      id: true,
      name: true,
      schoolId: true,
      reportLayout: true
    }
  });
  console.log(JSON.stringify(classes, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
