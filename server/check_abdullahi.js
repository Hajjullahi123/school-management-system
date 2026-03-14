const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Abdullahi' } },
        { lastName: { contains: 'Lawal' } }
      ]
    },
    include: {
      school: true
    }
  });

  console.log('--- Abdullahi Lawal Search Results ---');
  users.forEach(u => {
    console.log(`User ID: ${u.id}, Username: ${u.username}, Name: ${u.firstName} ${u.lastName}, Role: ${u.role}, School ID: ${u.schoolId} (${u.school?.name})`);
  });

  const school3UsersCount = await prisma.user.count({
    where: { schoolId: 3 }
  });
  console.log(`\nTotal users in School 3: ${school3UsersCount}`);

  const school3Schools = await prisma.school.findMany({
    where: { id: 3 }
  });
  console.log(`School 3 Data: ${JSON.stringify(school3Schools, null, 2)}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
