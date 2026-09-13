const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ss2Classes = await prisma.class.findMany({
    where: { name: { contains: 'SS 2' } },
    include: {
      classSubjects: {
        include: { subject: true }
      }
    }
  });

  console.log(JSON.stringify(ss2Classes, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
