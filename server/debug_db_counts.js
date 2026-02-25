
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');

    // Count Schools
    const schoolCount = await prisma.school.count();
    console.log(`Total Schools: ${schoolCount}`);

    if (schoolCount > 0) {
      const schools = await prisma.school.findMany({ take: 5 });
      console.log('First 5 Schools:', schools.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
    }

    // Count Users
    const userCount = await prisma.user.count();
    console.log(`Total Users: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({ take: 5 });
      console.log('First 5 Users:', users.map(u => ({ id: u.id, username: u.username, role: u.role, schoolId: u.schoolId })));
    }

    // Count Students
    const studentCount = await prisma.student.count();
    console.log(`Total Students: ${studentCount}`);

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
