const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const users = await prisma.user.findMany({
    where: { firstName: 'Abuhurairah' },
    include: {
      parentProfile: {
        include: {
          parentChildren: true
        }
      }
    }
  });

  console.log(JSON.stringify(users, null, 2));
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
