const { PrismaClient } = require('@prisma/client');

async function main() {
  // Using the IP address discovered from previous Test-NetConnection
  const url = "postgresql://postgres.pxjjxorczgqyqnlqfhmt:EduTechAI123@54.247.26.119:5432/postgres?sslmode=no-verify&pgbouncer=false&connect_timeout=60";
  console.log('Testing connection with IP ADDRESS to bypass DNS...');
  
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
    console.log('✅ Success! Connection established via IP.');
    console.log('DB Time:', result);
  } catch (e) {
    console.error('❌ Failed even with IP address.');
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
