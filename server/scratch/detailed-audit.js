const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditDarulQuran() {
  try {
    const schools = await prisma.school.findMany({
      where: { name: { contains: 'Darul' } },
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            terms: true,
            FeeRecord: true,
            ClassFeeStructure: true
          }
        }
      }
    });

    console.log('--- Darul Quran Audit ---');
    schools.forEach(s => {
      console.log(`School ID: ${s.id}, Name: ${s.name}, Slug: ${s.slug}`);
      console.log(`  Classes: ${s._count.classes}`);
      console.log(`  Terms: ${s._count.terms}`);
      console.log(`  Students: ${s._count.students}`);
      console.log(`  Fee Structures: ${s._count.ClassFeeStructure}`);
      console.log(`  Fee Records: ${s._count.FeeRecord}`);
    });
    
    // Also check school 3 just in case
    const school3 = await prisma.school.findUnique({
      where: { id: 3 },
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            terms: true,
            FeeRecord: true,
            ClassFeeStructure: true
          }
        }
      }
    });
    if (school3) {
      console.log(`\nSchool ID: 3, Name: ${school3.name}, Slug: ${school3.slug}`);
      console.log(`  Classes: ${school3._count.classes}`);
      console.log(`  Terms: ${school3._count.terms}`);
      console.log(`  Students: ${school3._count.students}`);
      console.log(`  Fee Structures: ${school3._count.ClassFeeStructure}`);
      console.log(`  Fee Records: ${school3._count.FeeRecord}`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

auditDarulQuran();
