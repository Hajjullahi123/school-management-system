const prisma = require('./db');

async function inspectMahi() {
  const students = await prisma.student.findMany({
    where: {
      name: { contains: 'Mahi' }
    },
    include: {
      user: true
    }
  });

  console.log('Students containing Mahi:');
  console.dir(students, { depth: null });
}

inspectMahi().catch(console.error).finally(() => prisma.$disconnect());
