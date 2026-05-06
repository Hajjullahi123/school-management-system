const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllSchoolsWithStats() {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            terms: true,
            FeeRecord: true
          }
        }
      }
    });
    console.log('SCHOOL STATS:');
    schools.forEach(s => {
      console.log(`ID: ${s.id} | Name: ${s.name} | Students: ${s._count.students} | Classes: ${s._count.classes} | Terms: ${s._count.terms} | FeeRecords: ${s._count.FeeRecord}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllSchoolsWithStats();
