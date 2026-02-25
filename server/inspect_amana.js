const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const schools = await prisma.school.findMany({
      where: { name: { contains: 'Amana' } }
    });
    console.log('Schools:', JSON.stringify(schools.map(s => ({ id: s.id, name: s.name })), null, 2));

    if (schools.length > 0) {
      const schoolId = schools[0].id;
      const classes = await prisma.class.findMany({
        where: { schoolId }
      });
      console.log('Classes:', JSON.stringify(classes.map(c => ({ id: c.id, name: c.name, arm: c.arm })), null, 2));

      const session = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true }
      });
      console.log('Current Session:', JSON.stringify(session, null, 2));

      const students = await prisma.student.findMany({
        where: { schoolId, classModel: { name: { contains: 'JSS3' } } },
        include: { user: true, classModel: true }
      });
      console.log('JSS3 Students Sample:', JSON.stringify(students.slice(0, 3).map(s => ({ 
        id: s.id, 
        name: s.user.firstName + ' ' + s.user.lastName,
        class: s.classModel?.name,
        arm: s.classModel?.arm,
        status: s.status
      })), null, 2));
      
      const alumni = await prisma.alumni.findMany({
          where: { schoolId }
      });
      console.log('Alumni Count:', alumni.length);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
