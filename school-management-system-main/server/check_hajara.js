const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Hajara' } },
        { lastName: { contains: 'Hajara' } }
      ]
    }
  });
  console.log(user ? JSON.stringify(user) : 'No User Found');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
