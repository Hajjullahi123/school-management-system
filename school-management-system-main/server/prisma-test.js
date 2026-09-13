require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Prisma Environment Verification ---');
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment!');
    return;
  }
  console.log('Current DATABASE_URL (redacted):', process.env.DATABASE_URL.replace(/:[^:]+@/, ':****@'));
  
  try {
    console.log('Attempting to connect to database...');
    // Add a timeout query to ensure we don't hang
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Connection Successful!');
    console.log('Database time:', result);
    
    const schoolCount = await prisma.school.count();
    console.log('Total schools found:', schoolCount);
    
  } catch (e) {
    console.error('❌ Connection Failed');
    console.error('Error Code:', e.code);
    console.error('Error Message:', e.message);
    console.error('Full Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
