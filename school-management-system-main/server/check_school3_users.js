const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { schoolId: 3 },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true
    }
  });

  console.log(`--- Users in School 3 (Count: ${users.length}) ---`);
  users.forEach(u => {
    console.log(`[${u.id}] ${u.username}: ${u.firstName} ${u.lastName} (${u.role})`);
  });

  const schools = await prisma.school.findMany();
  console.log('\n--- All Schools ---');
  schools.forEach(s => {
    console.log(`[${s.id}] ${s.name} (${s.slug})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
