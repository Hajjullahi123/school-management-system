const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Last 10 Users Created ---');
  
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      Parent: true
    }
  });

  for (const user of users) {
    console.log(`[${user.createdAt.toISOString()}] ${user.firstName} ${user.lastName} (${user.username}) - Role: ${user.role}`);
    if (user.Parent) console.log(`  -> Parent Profile ID: ${user.Parent.id}`);
  }

  await prisma.$disconnect();
}

check();
