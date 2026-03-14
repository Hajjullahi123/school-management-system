const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function pushSchema() {
  const prisma = new PrismaClient();
  try {
    console.log('Reading schema SQL...');
    let sql = fs.readFileSync(path.join(__dirname, 'schema_utf8.sql'), 'utf8');

    // Remove BOM if present
    if (sql.charCodeAt(0) === 0xFEFF) {
      console.log('Removing BOM...');
      sql = sql.slice(1);
    }

    // Split by semicolons for safer execution, though might be tricky with comments.
    // Let's try splitting by "-- CreateTable" blocks if possible, or just run one by one.

    const statements = sql.split(';').filter(s => s.trim().length > 0);
    console.log(`Found ${statements.length} SQL statements. Executing one by one...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (e) {
          console.error(`Error in statement ${i}:`, stmt.substring(0, 100));
          console.error(e.message);
          // If table already exists, we might want to continue, but here it's a fresh DB
          throw e;
        }
      }
    }

    console.log('Successfully pushed all schema statements to Aiven!');
  } catch (error) {
    console.error('Failed to push schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

pushSchema();
