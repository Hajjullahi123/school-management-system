const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Superadmin Users Check ---');
  const superadmins = await prisma.user.findMany({
    where: {
      role: 'superadmin'
    },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      schoolId: true
    }
  });

  if (superadmins.length === 0) {
    console.log('No superadmin users found in the database.');
  } else {
    console.log(JSON.stringify(superadmins, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
