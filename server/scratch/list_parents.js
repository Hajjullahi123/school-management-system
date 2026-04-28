const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Searching for ALL Parent Users ---');
  
  const users = await prisma.user.findMany({
    where: { role: 'parent' },
    include: {
      Parent: {
        include: {
          parentChildren: true
        }
      }
    }
  });

  console.log(`Found ${users.length} parent users.`);
  for (const user of users) {
    console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.username}) [ID: ${user.id}] School: ${user.schoolId}`);
    if (user.Parent) {
      console.log(`Parent Profile ID: ${user.Parent.id}, School: ${user.Parent.schoolId}, Linked Students: ${user.Parent.parentChildren.length}`);
    } else {
      console.log('No Parent profile linked to this User record!');
    }
  }

  await prisma.$disconnect();
}

check();
