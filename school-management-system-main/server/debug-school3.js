const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSchool3() {
  const sId = 3;
  try {
    console.log(`\n🔍 DEBUGGING SCHOOL ID: ${sId} (Amana Academy)\n`);

    const sessions = await prisma.academicSession.findMany({ where: { schoolId: sId } });
    console.log('📅 SESSIONS:');
    sessions.forEach(s => console.log(`  - ${s.name} (ID: ${s.id}, Current: ${s.isCurrent})`));

    const terms = await prisma.term.findMany({ where: { schoolId: sId } });
    console.log('📅 TERMS:');
    terms.forEach(t => console.log(`  - ${t.name} (ID: ${t.id}, Current: ${t.isCurrent}, Session ID: ${t.academicSessionId})`));

    const classes = await prisma.class.findMany({ where: { schoolId: sId } });
    console.log(`🏫 CLASSES: ${classes.length}`);
    classes.forEach(c => console.log(`  - ${c.name} ${c.arm || ''} (ID: ${c.id}, Active: ${c.isActive})`));

    const students = await prisma.student.findMany({
      where: { schoolId: sId },
      include: { user: true, classModel: true }
    });
    console.log(`👨‍🎓 STUDENTS: ${students.length}`);
    students.forEach(s => console.log(`  - ${s.user.firstName} ${s.user.lastName} (ID: ${s.id}, Class: ${s.classModel?.name || 'None'}, Status: ${s.status})`));

    const feeStructures = await prisma.classFeeStructure.findMany({ where: { schoolId: sId } });
    console.log(`💰 FEE STRUCTURES: ${feeStructures.length}`);
    feeStructures.forEach(f => console.log(`  - Class ID ${f.classId}, Term ID ${f.termId}, Amount: ${f.amount}`));

    const feeRecords = await prisma.feeRecord.findMany({ where: { schoolId: sId } });
    console.log(`📋 FEE RECORDS: ${feeRecords.length}`);
    feeRecords.forEach(r => console.log(`  - Student ID ${r.studentId}, Term ID ${r.termId}, Session ID ${r.academicSessionId}, Balance: ${r.balance}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSchool3();
