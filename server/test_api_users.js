const prisma = require('./db');

async function testApiUsers() {
  const schoolId = 3;
  const role = 'student';
  const search = undefined;

  const where = { schoolId: schoolId };
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { username: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } }
    ];
  }

  console.log('Query Where:', JSON.stringify(where, null, 2));

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

  console.log(`Total users found: ${users.length}`);
  const roles = {};
  users.forEach(u => {
    roles[u.role] = (roles[u.role] || 0) + 1;
  });
  console.log('User roles distribution:', roles);

  if (users.length > 0) {
    console.log('Sample User:', JSON.stringify(users[0], null, 2));
  }
}

testApiUsers()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
