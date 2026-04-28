const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- All Parent Profiles in DB ---');
  const parents = await prisma.parent.findMany({
    include: {
      User: true,
      School: true
    }
  });

  for (const p of parents) {
    console.log(`Parent ID: ${p.id}, User: ${p.User?.firstName} ${p.User?.lastName}, School: ${p.School?.name} (ID: ${p.schoolId})`);
  }

  await prisma.$disconnect();
}

check();
