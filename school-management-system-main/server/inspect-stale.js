const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { logoUrl: { contains: 'onrender.com' } },
          { logoUrl: { contains: 'http' } }
        ]
      }
    });
    console.log('--- SCHOOLS WITH ABSOLUTE LOGOS ---');
    console.log(JSON.stringify(schools, null, 2));

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { photoUrl: { contains: 'onrender.com' } },
          { photoUrl: { contains: 'http' } }
        ]
      },
      take: 5
    });
    console.log('--- STUDENTS WITH ABSOLUTE PHOTOS ---');
    console.log(JSON.stringify(students, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
