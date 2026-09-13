const { PrismaClient } = require('@prisma/client');
const sqlite = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function checkSQLite() {
  try {
    const studentCount = await sqlite.student.count();
    const teacherCount = await sqlite.teacher.count();
    const classCount = await sqlite.class.count(); // Note: check if it's 'Class' or 'classModel'
    const subjectCount = await sqlite.subect?.count() || 0;

    console.log('--- LOCAL SQLITE STATUS ---');
    console.log(`Students: ${studentCount}`);
    console.log(`Teachers: ${teacherCount}`);
    console.log(`Classes:  ${classCount}`);
  } catch (e) {
    console.error('Error checking SQLite:', e.message);
  } finally {
    await sqlite.$disconnect();
  }
}
checkSQLite();
