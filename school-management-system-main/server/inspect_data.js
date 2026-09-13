const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Schools ---');
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.table(schools);

  console.log('\n--- Student Counts by School ---');
  const studentCounts = await prisma.student.groupBy({
    by: ['schoolId'],
    _count: { id: true }
  });
  console.table(studentCounts);

  console.log('\n--- User Counts by School ---');
  const userCounts = await prisma.user.groupBy({
    by: ['schoolId', 'role'],
    _count: { id: true }
  });
  console.table(userCounts);

  console.log('\n--- Specific User Check (Abdullahi) ---');
  const targetUsers = await prisma.user.findMany({
    where: {
      firstName: { contains: 'Abdullahi' }
    },
    select: { id: true, username: true, firstName: true, lastName: true, role: true, schoolId: true }
  });
  console.table(targetUsers);

  console.log('\n--- All Admins ---');
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, username: true, firstName: true, lastName: true, schoolId: true }
  });
  console.table(admins);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
