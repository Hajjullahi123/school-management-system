const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSchool1() {
  const sId = 1;
  try {
    console.log(`\n🔍 DEBUGGING SCHOOL ID: ${sId} (Darul Quran - default)\n`);

    const sessions = await prisma.academicSession.findMany({ where: { schoolId: sId } });
    console.log(`📅 SESSIONS: ${sessions.length}`);
    sessions.forEach(s => console.log(`  - ${s.name} (ID: ${s.id}, Current: ${s.isCurrent})`));

    const terms = await prisma.term.findMany({ where: { schoolId: sId } });
    console.log(`📅 TERMS: ${terms.length}`);
    terms.forEach(t => console.log(`  - ${t.name} (ID: ${t.id}, Current: ${t.isCurrent}, Session ID: ${t.academicSessionId})`));

    const classes = await prisma.class.findMany({ where: { schoolId: sId } });
    console.log(`🏫 CLASSES: ${classes.length}`);
    classes.forEach(c => console.log(`  - ${c.name} ${c.arm || ''} (ID: ${c.id}, Active: ${c.isActive})`));

    const students = await prisma.student.findMany({
      where: { schoolId: sId }
    });
    console.log(`👨‍🎓 STUDENTS: ${students.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSchool1();
