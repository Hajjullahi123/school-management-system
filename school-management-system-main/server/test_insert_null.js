const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const existing = await prisma.result.findFirst({
      where: { studentId: 93, subjectId: 21 }
    });

    if (!existing) {
      console.log('Result not found');
      return;
    }

    const updated = await prisma.result.update({
      where: { id: existing.id },
      data: { assignment1Score: null, assignment2Score: null }
    });

    console.log("Updated Prisma:", updated.assignment1Score, updated.assignment2Score);

    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./dev.db');
    db.get('SELECT assignment1Score, assignment2Score FROM Result WHERE id = ?', [existing.id], (err, row) => {
      console.log("Queried SQLite:", row);
      db.close();
      prisma.$disconnect();
    });

  } catch (err) {
    console.error(err);
    prisma.$disconnect();
  }
}

run();
