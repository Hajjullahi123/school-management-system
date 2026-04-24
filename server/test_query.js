const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  console.log('Querying...');
  const start = Date.now();
  const globalUser = await prisma.user.findFirst({
    where: { 
      OR: [
        { username: { equals: 'DQA/AL/2026/001' } }, 
        { email: { equals: 'DQA/AL/2026/001' } }
      ] 
    }
  });
  console.log('Result in', Date.now() - start, 'ms', !!globalUser);
}
test().catch(console.error).finally(() => prisma.$disconnect());
