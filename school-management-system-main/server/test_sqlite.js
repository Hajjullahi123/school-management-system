const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:\\Users\\IT-LAB\\School Mn\\server\\prisma\\dev.db');

db.serialize(() => {
  db.each("SELECT studentId, assignment1Score, assignment2Score FROM Result WHERE classId = 3 AND subjectId = 21 LIMIT 5", (err, row) => {
    if (err) {
      console.error(err);
    }
    console.log(row);
  });
});

db.close();
