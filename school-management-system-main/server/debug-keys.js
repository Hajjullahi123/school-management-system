const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const global = await prisma.globalSettings.findFirst();
  const mask = (key) => key ? key.substring(0, 4) + '...' + key.substring(key.length - 4) : 'NOT SET';
  console.log('Global Key:', mask(global?.geminiApiKey));
  
  const schools = await prisma.school.findMany();
  schools.forEach(s => {
    console.log(`School ${s.id} (${s.name}): ${mask(s.geminiApiKey)}`);
  });
  
  await prisma.$disconnect();
}

check();
