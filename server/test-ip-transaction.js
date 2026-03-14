const { PrismaClient } = require('@prisma/client');

async function main() {
  // Testing Transaction Mode (6543) via IP to fix P2024 exhaustion
  const url = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@54.247.26.119:6543/postgres?sslmode=no-verify&pgbouncer=true&connect_timeout=60";
  console.log('Testing Transaction Mode (6543) via IP ADDRESS...');
  
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
    console.log('✅ Success! Transaction Mode works via IP.');
    console.log('DB Time:', result);
  } catch (e) {
    console.error('❌ Failed Transaction Mode via IP.');
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
