const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, logoUrl: true }
    });
    console.log('--- SCHOOLS ---');
    console.log(JSON.stringify(schools, null, 2));

    const studentsWithPhotos = await prisma.student.findMany({
      where: { photoUrl: { not: null } },
      select: { id: true, photoUrl: true },
      take: 10
    });
    console.log('--- STUDENTS WITH PHOTOS ---');
    console.log(JSON.stringify(studentsWithPhotos, null, 2));

    const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
    console.log('--- CURRENT SESSION ---');
    console.log(JSON.stringify(session, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
