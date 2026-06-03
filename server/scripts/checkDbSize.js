require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDbSize() {
  try {
    // Run raw SQL to get the exact size of the current PostgreSQL database
    const result = await prisma.$queryRawUnsafe(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    
    console.log("=========================================");
    console.log(`CURRENT DATABASE SIZE: ${result[0].size}`);
    console.log("=========================================");
  } catch (err) {
    console.error("Error checking database size:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkDbSize();
