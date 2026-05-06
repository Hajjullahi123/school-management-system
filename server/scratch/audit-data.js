const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditDarulQuranData() {
  const sIds = [1, 4];
  try {
    for (const sId of sIds) {
      console.log(`\n--- AUDITING SCHOOL ID: ${sId} ---`);
      
      const classes = await prisma.class.findMany({ where: { schoolId: sId } });
      console.log(`Classes: ${classes.length}`);
      classes.forEach(c => {
        if (!c.name) console.log(`  ⚠️ Class ID ${c.id} has no name!`);
      });

      const terms = await prisma.term.findMany({ 
        where: { schoolId: sId },
        include: { academicSession: true }
      });
      console.log(`Terms: ${terms.length}`);
      terms.forEach(t => {
        if (!t.name) console.log(`  ⚠️ Term ID ${t.id} has no name!`);
        if (!t.academicSession) console.log(`  ⚠️ Term ID ${t.id} ("${t.name}") has NO academic session!`);
      });

      const sessions = await prisma.academicSession.findMany({ where: { schoolId: sId } });
      console.log(`Sessions: ${sessions.length}`);
      sessions.forEach(s => {
        if (!s.name) console.log(`  ⚠️ Session ID ${s.id} has no name!`);
      });

      const feeStructures = await prisma.classFeeStructure.findMany({ where: { schoolId: sId } });
      console.log(`Fee Structures: ${feeStructures.length}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

auditDarulQuranData();
