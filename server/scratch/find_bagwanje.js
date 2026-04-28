const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Searching for ANY user with "Bagwanje" ---');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Bagwanje' } },
        { lastName: { contains: 'Bagwanje' } },
        { username: { contains: 'Bagwanje' } }
      ]
    },
    include: {
      Parent: {
        include: {
          parentChildren: true
        }
      }
    }
  });

  console.log(`Found ${users.length} matching users.`);
  for (const user of users) {
    console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.username}) [ID: ${user.id}] Role: ${user.role}`);
    if (user.Parent) {
      console.log(`Parent ID: ${user.Parent.id}, Linked Students: ${user.Parent.parentChildren.length}`);
    }
  }

  await prisma.$disconnect();
}

check();
