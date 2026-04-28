const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking for phone number: 08109051576 ---');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: '08109051576' } },
        { phone: { contains: '08109051576' } }
      ]
    },
    include: {
      Parent: true
    }
  });

  console.log(`Found ${users.length} matching users.`);
  for (const user of users) {
    console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.username}) [ID: ${user.id}]`);
    console.log(`Role: ${user.role}, SchoolID: ${user.schoolId}`);
    if (user.Parent) {
      console.log(`Parent Profile ID: ${user.Parent.id}`);
    }
  }

  const parents = await prisma.parent.findMany({
    where: {
      phone: { contains: '08109051576' }
    },
    include: {
      User: true,
      parentChildren: true
    }
  });

  console.log(`\nFound ${parents.length} matching parent profiles.`);
  for (const parent of parents) {
    console.log(`\nParent Profile: [ID: ${parent.id}] Phone: ${parent.phone}`);
    console.log(`Linked User: ${parent.User?.firstName} ${parent.User?.lastName} (${parent.User?.username})`);
    console.log(`Linked Students: ${parent.parentChildren.length}`);
  }

  await prisma.$disconnect();
}

check();
