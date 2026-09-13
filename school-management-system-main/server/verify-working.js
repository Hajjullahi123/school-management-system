const { PrismaClient } = require('@prisma/client');

async function main() {
  const url = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=false&connect_timeout=30";
  console.log('Testing EXACT working URL from step 411...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Success! Connection established.');
    console.log('DB Time:', result);
  } catch (e) {
    console.error('❌ Failed even with previously working URL.');
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
