const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 3; // Based on my previous debug output
  
  const users = await prisma.user.findMany({
    where: { schoolId },
    include: {
      Parent: true
    }
  });
  
  console.log(`Found ${users.length} users for school ${schoolId}`);
  const parents = users.filter(u => u.role === 'parent');
  console.log(`Users with role 'parent': ${parents.length}`);
  
  parents.forEach(p => {
    console.log(`User ID: ${p.id}, Username: ${p.username}, Parent Profile ID: ${p.Parent?.id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
