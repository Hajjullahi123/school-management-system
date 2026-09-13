const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyQuery() {
  const schoolId = 3; // From the logs
  const role = 'student'; // From the frontend filter in screenshot

  const where = { schoolId };
  if (role && role !== 'all') {
    where.role = role;
  }

  console.log('Final SQL-like Where:', JSON.stringify(where, null, 2));

  const users = await prisma.user.findMany({
    where,
    include: {
      student: {
        include: {
          classModel: true
        }
      },
      teacher: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Results count: ${users.length}`);
  if (users.length > 0) {
    console.log('Sample user 0 role:', users[0].role);
    console.log('Sample user 0 student status:', users[0].student?.status);
  } else {
    console.log('NO USERS FOUND for query.');
  }
}

verifyQuery()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
