const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const global = await prisma.globalSettings.findFirst();
  console.log('Global Settings:', JSON.stringify(global, (key, value) => {
    if (key === 'geminiApiKey' && value) return value.substring(0, 5) + '...';
    return value;
  }, 2));
  
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, geminiApiKey: true }
  });
  console.log('Schools:', schools.map(s => ({
    ...s,
    geminiApiKey: s.geminiApiKey ? s.geminiApiKey.substring(0, 5) + '...' : 'NONE'
  })));
  
  await prisma.$disconnect();
}

check();
