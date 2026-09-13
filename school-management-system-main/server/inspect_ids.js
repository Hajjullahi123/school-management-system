const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('--- Schools ---');
    console.table(schools);

    for (const school of schools) {
      console.log(`\n--- School: ${school.name} (ID: ${school.id}) ---`);

      const studentCount = await prisma.student.count({ where: { schoolId: school.id } });
      console.log(`Student Count: ${studentCount}`);

      if (studentCount > 0) {
        const sampleStudents = await prisma.student.findMany({
          where: { schoolId: school.id },
          take: 5,
          include: { user: { select: { firstName: true, lastName: true } } }
        });
        console.log('Sample Students:');
        console.table(sampleStudents.map(s => ({
          id: s.id,
          name: `${s.user.firstName} ${s.user.lastName}`,
          admissionNumber: s.admissionNumber
        })));
      }

      const staffCount = await prisma.user.count({
        where: {
          schoolId: school.id,
          role: { in: ['admin', 'teacher', 'principal', 'accountant', 'staff'] }
        }
      });
      console.log(`Staff Count: ${staffCount}`);

      if (staffCount > 0) {
        const sampleStaff = await prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: { in: ['admin', 'teacher', 'principal', 'accountant', 'staff'] }
          },
          take: 5
        });
        console.log('Sample Staff:');
        console.table(sampleStaff.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          username: u.username,
          email: u.email,
          role: u.role
        })));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
