const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }
});

const tables = [
  'School', 'User', 'Student', 'Teacher', 'Class', 'Subject',
  'AcademicSession', 'Term', 'Result', 'AttendanceRecord', 'FeeRecord'
];

async function check() {
  console.log(`--- SQLITE DATA CHECK (${dbPath}) ---`);
  for (const table of tables) {
    await new Promise((resolve) => {
      db.get(`SELECT COUNT(*) as count FROM "${table}"`, (err, row) => {
        if (err) {
          console.log(`${table}: ERROR - ${err.message}`);
        } else {
          console.log(`${table}: ${row.count}`);
        }
        resolve();
      });
    });
  }
  db.close();
}

check();
