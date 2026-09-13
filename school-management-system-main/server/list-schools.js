const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSchools() {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            feeRecords: true
          }
        }
      }
    });

    console.log('\n🏫 SCHOOLS IN DATABASE:\n');
    schools.forEach(s => {
      console.log(`- ${s.name} (ID: ${s.id}, Slug: ${s.slug})`);
      console.log(`  Students: ${s._count.students}`);
      console.log(`  Classes: ${s._count.classes}`);
      console.log(`  Fee Records: ${s._count.feeRecords}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listSchools();
