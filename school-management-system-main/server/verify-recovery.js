const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
  console.log('--- Final Recovery Verification ---');
  console.log('URL (redacted):', process.env.DATABASE_URL.replace(/:[^:]+@/, ':****@'));
  
  const prisma = new PrismaClient();

  try {
    console.log('Attempting to connect with refined pool settings...');
    // Multiple queries to test pool acquisition
    const results = await Promise.all([
      prisma.$queryRaw`SELECT NOW() as t1`,
      prisma.$queryRaw`SELECT NOW() as t2`
    ]);
    
    console.log('✅ Success! Double connection acquisition verified.');
    console.log('Results:', results);
    
    const count = await prisma.school.count();
    console.log('Total schools confirmed:', count);
    
  } catch (e) {
    console.error('❌ Verification failed with refined settings.');
    console.error('Error Code:', e.code);
    console.error('Error Message:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
