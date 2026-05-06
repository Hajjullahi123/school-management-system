const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKeys() {
  const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && typeof prisma[k] === 'object');
  console.log('Prisma Model Keys:', keys.sort().join(', '));
  process.exit(0);
}

checkKeys();
