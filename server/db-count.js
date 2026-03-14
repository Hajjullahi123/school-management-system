const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function count() {
  try {
    const schoolCount = await prisma.school.count();
    const userCount = await prisma.user.count();
    const studentCount = await prisma.student.count();
    const teacherCount = await prisma.teacher.count();

    console.log('--- DATABASE STATUS ---');
    console.log(`Schools:  ${schoolCount}`);
    console.log(`Users:    ${userCount}`);
    console.log(`Students: ${studentCount}`);
    console.log(`Teachers: ${teacherCount}`);

    if (schoolCount > 0) {
      const schools = await prisma.school.findMany({ select: { name: true, slug: true } });
      console.log('Schools found:', schools);
    }
  } catch (e) {
    console.error('Error counting records:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
count();
