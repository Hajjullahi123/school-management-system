const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAlumni() {
  try {
    console.log('--- Schools Check ---');
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log(JSON.stringify(schools, null, 2));

    const amana = schools.find(s => s.name.includes('Amana') || s.slug.includes('amana'));
    if (!amana) {
      console.log('Could not find Amana school');
    } else {
      console.log(`Found Amana Academy: ID ${amana.id}`);

      console.log('\n--- Alumni Records for this School ---');
      const alumni = await prisma.alumni.findMany({
        where: { schoolId: amana.id },
        include: {
          student: {
            include: { user: true }
          }
        }
      });
      console.log(`Found ${alumni.length} alumni records`);
      alumni.forEach(a => {
        console.log(`- ${a.student.user.firstName} ${a.student.user.lastName} (Student ID: ${a.studentId}, Status: ${a.student.status}, isPublic: ${a.isPublic})`);
      });

      console.log('\n--- Students with status alumni for this School ---');
      const students = await prisma.student.findMany({
        where: {
          schoolId: amana.id,
          status: 'alumni'
        },
        include: { user: true }
      });
      console.log(`Found ${students.length} students with status: alumni`);
      students.forEach(s => {
        console.log(`- ${s.user.firstName} ${s.user.lastName} (ID: ${s.id})`);
      });
    }

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAlumni();
