const prisma = require('./db');

async function check() {
  const identifier = 'dqa/ma/2026/010';
  console.log('Searching for identifier:', identifier);

  const [student, teacher, user] = await Promise.all([
    prisma.student.findFirst({
      where: { admissionNumber: identifier },
      include: { school: true, user: true }
    }),
    prisma.teacher.findFirst({
      where: { staffId: identifier },
      include: { school: true, user: true }
    }),
    prisma.user.findFirst({
        where: { OR: [{ username: identifier }, { email: identifier }] },
        include: { school: true }
    })
  ]);

  if (student) {
    console.log('FOUND STUDENT:');
    console.log('  School:', student.school.name, `(${student.school.slug})`);
    console.log('  User Status:', student.user.isActive ? 'Active' : 'Inactive');
  } else if (teacher) {
    console.log('FOUND TEACHER:');
    console.log('  School:', teacher.school.name, `(${teacher.school.slug})`);
    console.log('  User Status:', teacher.user.isActive ? 'Active' : 'Inactive');
  } else if (user) {
    console.log('FOUND USER:');
    console.log('  Role:', user.role);
    console.log('  School:', user.school?.name || 'GLOBAL');
    console.log('  Status:', user.isActive ? 'Active' : 'Inactive');
  } else {
    console.log('NOT FOUND IN DATABASE');
  }

  await prisma.$disconnect();
}

check();
