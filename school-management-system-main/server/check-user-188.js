const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 188 }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch((e) => {
    process.exit(1);
  });
