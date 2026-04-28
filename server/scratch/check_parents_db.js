const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parents = await prisma.parent.findMany({
    include: {
      User: true,
      parentChildren: true
    }
  });
  console.log('--- Parents in DB ---');
  parents.forEach(p => {
    console.log(`ID: ${p.id}, UserID: ${p.userId}, SchoolID: ${p.schoolId}, Role: ${p.User?.role}, Phone: ${p.phone}`);
    console.log(`Wards: ${p.parentChildren.length}`);
  });

  const users = await prisma.user.findMany({
    where: { role: 'parent' }
  });
  console.log('\n--- Users with role "parent" ---');
  users.forEach(u => {
    console.log(`ID: ${u.id}, Username: ${u.username}, SchoolID: ${u.schoolId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
