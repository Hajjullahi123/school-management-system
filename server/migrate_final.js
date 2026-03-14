require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

async function migrateFinal() {
  try {
    console.log('--- MIGRATING MISSED TABLES (Targeted) ---');

    // Specifically missed due to date parsing error
    const tables = ['SchoolHoliday'];

    for (const table of tables) {
      const rows = await query(`SELECT * FROM "${table}"`);
      console.log(`\nMigrating ${rows.length} records from ${table}...`);
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);

      let successCount = 0;
      for (const row of rows) {
        try {
          const data = { ...row };

          if (data.date && typeof data.date === 'number') {
            data.date = new Date(data.date);
          }
          if (data.createdAt && typeof data.createdAt === 'number') {
            data.createdAt = new Date(data.createdAt);
          }
          // Remove nulls
          for (const key in data) {
            if (data[key] === null) delete data[key];
          }

          await prisma[modelName].upsert({
            where: { id: row.id },
            update: data,
            create: data
          });
          successCount++;
        } catch (err) {
          console.error(`\n[ERROR] ${table} ID ${row.id}:`, err.message);
        }
      }
      console.log(`Finished ${table}: ${successCount}/${rows.length} Success`);
    }

    console.log('\nFinal gaps plugged successfully.');

  } catch (error) {
    console.error('\nFatal Error:', error.message);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

migrateFinal();
