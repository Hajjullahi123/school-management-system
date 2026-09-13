const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const parents = await prisma.parent.findMany({
    include: { user: true, students: true }
  });

  console.log('--- ALL PARENTS ---');
  for (const p of parents) {
    console.log(`Parent ID: ${p.id}, User: ${p.user.firstName} ${p.user.lastName}, Phone: ${p.phone}, Wards: ${p.students.length}`);
  }

  const students = await prisma.student.findMany({
    where: { parentGuardianPhone: { not: null } },
    select: { id: true, admissionNumber: true, parentGuardianName: true, parentGuardianPhone: true, parentId: true }
  });

  console.log('\n--- ALL STUDENTS WITH PARENT INFO ---');
  for (const s of students) {
    console.log(`Student ID: ${s.id}, Adm: ${s.admissionNumber}, PName: ${s.parentGuardianName}, PPhone: ${s.parentGuardianPhone}, ParentID: ${s.parentId}`);
  }
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
