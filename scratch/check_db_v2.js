const prisma = require('./server/db');

async function main() {
  console.log('--- DB DIAGNOSTICS ---');
  
  try {
    const schools = await prisma.school.findMany({
        select: { id: true, name: true, code: true }
    });
    
    for (const school of schools) {
      const sCount = await prisma.student.count({ where: { schoolId: school.id } });
      const activeSCount = await prisma.student.count({ where: { schoolId: school.id, status: 'active' } });
      const cCount = await prisma.class.count({ where: { schoolId: school.id, isActive: true } });
      const subCount = await prisma.subject.count({ where: { schoolId: school.id } });
      
      console.log(`\nSCHOOL: ${school.name} (ID: ${school.id}, Code: ${school.code})`);
      console.log(`- Students: Total=${sCount}, Active=${activeSCount}`);
      console.log(`- Classes: Active=${cCount}`);
      console.log(`- Subjects: Total=${subCount}`);

      // Check one student to see their schoolId and status
      if (sCount > 0) {
          const sample = await prisma.student.findFirst({ where: { schoolId: school.id } });
          console.log(`  Sample Student: ${sample.id}, status="${sample.status}", schoolId=${sample.schoolId}`);
      }
    }
  } catch (err) {
    console.error('DB Error:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
