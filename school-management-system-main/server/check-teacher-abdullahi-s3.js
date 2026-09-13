const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      schoolId: 3,
      role: 'teacher',
      firstName: 'Abdullahi'
    }
  });

  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    process.exit(1);
  });
