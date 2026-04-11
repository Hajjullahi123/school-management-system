const prisma = require('./server/db');

async function main() {
  console.log('Checking database counts...');
  
  try {
    const schools = await prisma.school.findMany();
    console.log(`Total Schools: ${schools.length}`);
    
    for (const school of schools) {
      const studentCount = await prisma.student.count({ where: { schoolId: school.id } });
      const activeStudentCount = await prisma.student.count({ where: { schoolId: school.id, status: 'active' } });
      const classCount = await prisma.class.count({ where: { schoolId: school.id } });
      const subjectCount = await prisma.subject.count({ where: { schoolId: school.id } });
      
      console.log(`School: ${school.name} (ID: ${school.id})`);
      console.log(`- Students: ${studentCount} (${activeStudentCount} active)`);
      console.log(`- Classes: ${classCount}`);
      console.log(`- Subjects: ${subjectCount}`);
    }
  } catch (err) {
    console.error('DB Error:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
