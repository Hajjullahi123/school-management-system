const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'Hajara' } },
        { firstName: { contains: 'Hajara' } },
        { lastName: { contains: 'Hajara' } }
      ]
    },
    include: {
      teacher: true,
      classesAsTeacher: true
    }
  });

  console.log('Found users matching "Hajara":');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
