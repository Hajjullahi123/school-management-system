const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true, slug: true } });
  console.log('Schools found:', JSON.stringify(schools, null, 2));

  console.log('--- ALL DEPARTMENTS ---');
  const depts = await prisma.department.findMany({
    include: { head: { select: { id: true, firstName: true, lastName: true } } }
  });
  console.log(JSON.stringify(depts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
