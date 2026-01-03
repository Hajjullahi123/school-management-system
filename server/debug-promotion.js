const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFetch() {
  try {
    console.log('Fetching classes...');
    const cls = await prisma.class.findFirst();
    if (!cls) {
      console.log('No classes found to test with.');
      return;
    }
    console.log(`Testing with Class ID: ${cls.id} (${cls.name})`);

    console.log('Running query...');
    const students = await prisma.student.findMany({
      where: {
        classId: cls.id,
        status: 'active'
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true }
        },
        reportCards: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    console.log('Query successful!');
    console.log(`Found ${students.length} students.`);
    if (students.length > 0) {
      console.log('Sample student:', students[0].user.firstName);
      console.log('Report cards loaded:', students[0].reportCards.length);
    }
  } catch (error) {
    console.error('Query FAILED:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFetch();
