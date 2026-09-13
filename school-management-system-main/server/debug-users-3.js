const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { schoolId: 3 }
  });
  console.log(JSON.stringify(users.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role })), null, 2));
}

main()
  .catch((e) => {
    process.exit(1);
  });
