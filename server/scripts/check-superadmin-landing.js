const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schools = await prisma.school.findMany({ select: { id: true, slug: true, name: true }});
  console.log('Schools:', schools);
  
  const global = await prisma.globalSettings.findFirst();
  console.log('Global Settings:', global);
}

check().catch(console.error).finally(() => prisma.$disconnect());
