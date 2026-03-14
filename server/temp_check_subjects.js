const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quranTeachers = await prisma.teacher.findMany({
    where: {
      specialization: {
        contains: 'Quran'
      }
    },
    include: {
      user: true
    }
  });
  console.log('QURAN TEACHERS:', JSON.stringify(quranTeachers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
