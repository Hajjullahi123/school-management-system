const { PrismaClient } = require('@prisma/client');

async function main() {
  // Testing Final Optimized Configuration (6543, limit=3, IP)
  const url = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@54.247.26.119:6543/postgres?sslmode=no-verify&pgbouncer=true&connection_limit=3&connect_timeout=60";
  console.log('Testing Final Optimized Configuration...');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    console.log('Attempting to connect...');
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Success! Final configuration is stable.');
    console.log('DB Time:', result);
    
    const count = await prisma.school.count();
    console.log('Total schools:', count);
    
  } catch (e) {
    console.error('❌ Final configuration failed.');
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
