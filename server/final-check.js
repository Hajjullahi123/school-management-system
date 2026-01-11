const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const teachers = await prisma.teacher.findMany({ select: { id: true, photoUrl: true, user: true } });
  console.log('--- TEACHERS ---');
  console.log(JSON.stringify(teachers, null, 2));

  const schools = await prisma.school.findMany({ select: { id: true, logoUrl: true, name: true } });
  console.log('--- SCHOOLS ---');
  console.log(JSON.stringify(schools, null, 2));
}

check();
