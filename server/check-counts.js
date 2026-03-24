const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: 4 } }),
    prisma.subject.findMany({ where: { schoolId: 4 } })
  ]);
  console.log('Classes:', classes.length);
  console.log('Subjects:', subjects.length);
}

main()
  .catch((e) => {
    process.exit(1);
  });
