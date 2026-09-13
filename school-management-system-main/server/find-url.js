const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTheUrl() {
  const target = 'school-2-logo-1767880578124.png';
  console.log(`Searching for any record containing: ${target}`);

  try {
    const schools = await prisma.school.findMany({
      where: { logoUrl: { contains: target } }
    });
    console.log('Schools found:', JSON.stringify(schools, null, 2));

    const students = await prisma.student.findMany({
      where: { photoUrl: { contains: target } }
    });
    console.log('Students found:', JSON.stringify(students, null, 2));

    // Let's also just list ALL schools to be sure
    const allSchools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true }
    });
    console.log('All Schools:', JSON.stringify(allSchools, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findTheUrl();
