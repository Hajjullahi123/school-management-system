
const prisma = require('./server/db');

async function listData() {
  try {
    console.log('--- Schools ---');
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    console.table(schools);

    console.log('\n--- Classes ---');
    const classes = await prisma.class.findMany({ select: { id: true, name: true, schoolId: true } });
    console.table(classes);

    console.log('\n--- Academic Sessions ---');
    const sessions = await prisma.academicSession.findMany({ select: { id: true, name: true, schoolId: true } });
    console.table(sessions);

    console.log('\n--- Terms ---');
    const terms = await prisma.term.findMany({ 
      select: { id: true, name: true, schoolId: true, academicSessionId: true } 
    });
    console.table(terms);
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listData();
