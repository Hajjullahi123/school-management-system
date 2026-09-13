
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

console.log('Probing:', dbPath);

db.serialize(() => {
  db.get("SELECT COUNT(*) as count FROM School", (err, row) => {
    if (err) console.error('School error:', err);
    else console.log('Schools:', row.count);
  });

  db.get("SELECT COUNT(*) as count FROM User", (err, row) => {
    if (err) console.error('User error:', err);
    else console.log('Users:', row.count);
  });

  db.get("SELECT COUNT(*) as count FROM Student", (err, row) => {
    if (err) console.error('Student error:', err);
    else console.log('Students:', row.count);
  });
});

db.close();
