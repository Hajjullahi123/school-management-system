const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function pushSchema() {
  const prisma = new PrismaClient();
  try {
    console.log('Reading schema SQL...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema_utf8.sql'), 'utf8');

    // Split by -- CreateTable or similar if needed, but trial first as a block
    // Actually, splitting by semicolon might be safer for some drivers, 
    // but Prisma usually handles multi-statement strings for PG.

    console.log('Attempting to execute SQL on database...');
    // We use $executeRawUnsafe for the whole block
    await prisma.$executeRawUnsafe(sql);

    console.log('Successfully pushed schema to Aiven!');
  } catch (error) {
    console.error('Failed to push schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

pushSchema();
