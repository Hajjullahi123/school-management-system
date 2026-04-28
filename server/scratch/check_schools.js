const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking Schools ---');
  const schools = await prisma.school.findMany();
  for (const s of schools) {
    console.log(`School ID: ${s.id}, Name: ${s.name}, Slug: ${s.slug}`);
  }

  console.log('\n--- Checking Student 124 (Ummusalma) School Context ---');
  const student = await prisma.student.findUnique({
    where: { id: 124 },
    include: { school: true }
  });
  if (student) {
    console.log(`Student School: ${student.school?.name} (ID: ${student.schoolId})`);
  } else {
    console.log('Student 124 not found locally.');
  }

  await prisma.$disconnect();
}

check();
