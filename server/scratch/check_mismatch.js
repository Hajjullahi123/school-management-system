const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking Ummusalma and Abuhurairah ---');
  
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { parentGuardianName: { contains: 'Abuhurairah' } },
        { user: { firstName: { contains: 'Ummusalma' } } },
        { name: { contains: 'Ummusalma' } }
      ]
    },
    include: {
      user: true,
      parent: {
        include: { User: true }
      }
    }
  });

  console.log(`Found ${students.length} students.`);
  for (const s of students) {
    console.log(`\nStudent ID: ${s.id}, Name: ${s.user?.firstName || s.name}, schoolId: ${s.schoolId}`);
    console.log(`parentId: ${s.parentId}, Parent Name: ${s.parentGuardianName}`);
    if (s.parent) {
      console.log(`Linked Parent ID: ${s.parent.id}, User ID: ${s.parent.userId}, schoolId: ${s.parent.schoolId}`);
      console.log(`Parent User: ${s.parent.User?.firstName} ${s.parent.User?.lastName} (${s.parent.User?.username})`);
    } else {
      console.log('No parent link found.');
    }
  }

  const parents = await prisma.parent.findMany({
    where: {
      OR: [
        { phone: { contains: '08109051576' } },
        { User: { firstName: { contains: 'Abuhurairah' } } }
      ]
    },
    include: {
      User: true,
      parentChildren: true
    }
  });

  console.log(`\nFound ${parents.length} parents.`);
  for (const p of parents) {
    console.log(`\nParent ID: ${p.id}, Name: ${p.User?.firstName} ${p.User?.lastName}, schoolId: ${p.schoolId}`);
    console.log(`Linked Students: ${p.parentChildren.length}`);
    for (const s of p.parentChildren) {
      console.log(`  - Student ID: ${s.id}, schoolId: ${s.schoolId}`);
    }
  }

  await prisma.$disconnect();
}

check();
