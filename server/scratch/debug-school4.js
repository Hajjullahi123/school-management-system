const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSchool4() {
  const sId = 4;
  try {
    console.log(`\n🔍 DEBUGGING SCHOOL ID: ${sId} (Darul Quran Academy)\n`);

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
      where: { schoolId: sId },
      include: { classModel: true }
    });
    console.log(`👨‍🎓 STUDENTS: ${students.length}`);

    const feeStructures = await prisma.classFeeStructure.findMany({ where: { schoolId: sId } });
    console.log(`💰 FEE STRUCTURES: ${feeStructures.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSchool4();
