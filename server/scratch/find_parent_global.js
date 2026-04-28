const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Searching for Parent Profile for Abuhurairah across ALL schools ---');
  
  const parents = await prisma.parent.findMany({
    include: {
      User: true,
      School: true,
      parentChildren: true
    }
  });

  for (const p of parents) {
    if (p.User?.firstName?.includes('Abuhurairah') || p.User?.lastName?.includes('Bagwanje') || p.phone === '08109051576') {
      console.log(`\nFound Parent ID: ${p.id}`);
      console.log(`School: ${p.School?.name} (ID: ${p.schoolId})`);
      console.log(`User: ${p.User?.firstName} ${p.User?.lastName} (ID: ${p.userId})`);
      console.log(`Linked Students: ${p.parentChildren.length}`);
      for (const s of p.parentChildren) {
        console.log(`  - Student ID: ${s.id}, Name: ${s.name}, School ID: ${s.schoolId}`);
      }
    }
  }

  await prisma.$disconnect();
}

check();
