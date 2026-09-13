const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.groupBy({
    by: ['schoolId'],
    _count: { id: true }
  });
  console.log(JSON.stringify(subjects, null, 2));
}

main()
  .catch((e) => {
    process.exit(1);
  });
