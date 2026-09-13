const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const csCount = await prisma.classSubject.count({
    where: { schoolId: { in: [1, 4] } }
  });
  console.log('Class-Subject Records in Schools 1&4:', csCount);
}

main()
  .catch((e) => {
    process.exit(1);
  });
