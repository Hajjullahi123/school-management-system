const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFees() {
  const sId = 2; // Assuming School ID 2
  try {
    console.log(`\n🔍 DEBUGGING FEES FOR SCHOOL ID: ${sId}\n`);

    const students = await prisma.student.findMany({
      where: { schoolId: sId },
      include: { user: true }
    });
    console.log(`👨‍🎓 Total Students: ${students.length}`);

    const activeStudents = students.filter(s => s.status === 'active');
    console.log(`✅ Active Students: ${activeStudents.length}`);

    const feeRecords = await prisma.feeRecord.findMany({
      where: { schoolId: sId }
    });
    console.log(`📋 Total Fee Records: ${feeRecords.length}`);

    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId: sId, isCurrent: true }
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: sId, isCurrent: true }
    });

    console.log(`📅 Current Session: ${currentSession?.name || 'None'} (ID: ${currentSession?.id})`);
    console.log(`📅 Current Term: ${currentTerm?.name || 'None'} (ID: ${currentTerm?.id})`);

    if (currentTerm && currentSession) {
      const currentRecords = await prisma.feeRecord.findMany({
        where: {
          schoolId: sId,
          termId: currentTerm.id,
          academicSessionId: currentSession.id
        }
      });
      console.log(`📊 Records for Current Term/Session: ${currentRecords.length}`);

      const feeStructures = await prisma.classFeeStructure.findMany({
        where: {
          schoolId: sId,
          termId: currentTerm.id,
          academicSessionId: currentSession.id
        }
      });
      console.log(`💰 Fee Structures for Current Term: ${feeStructures.length}`);
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: sId }
    });
    console.log(`🏫 Total Classes: ${classes.length}`);
    classes.forEach(c => {
      const studentCount = students.filter(s => s.classId === c.id).length;
      console.log(`   - ${c.name} ${c.arm || ''} (ID: ${c.id}, Active: ${c.isActive}): ${studentCount} students`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFees();
