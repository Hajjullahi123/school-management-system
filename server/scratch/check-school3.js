const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchool3Data() {
  const sId = 3;
  try {
    console.log(`\n🔍 CHECKING SCHOOL ID: ${sId} (Amana Academy)\n`);

    const classes = await prisma.class.findMany({ where: { schoolId: sId }, take: 5 });
    console.log('Classes:');
    classes.forEach(c => console.log(`  - ${c.name}`));

    const students = await prisma.student.findMany({ 
      where: { schoolId: sId }, 
      take: 5,
      include: { user: true }
    });
    console.log('Students:');
    students.forEach(s => console.log(`  - ${s.user?.firstName} ${s.user?.lastName}`));

    const feeStructures = await prisma.classFeeStructure.findMany({ 
      where: { schoolId: sId },
      include: { Term: true, AcademicSession: true }
    });
    console.log(`Fee Structures: ${feeStructures.length}`);
    feeStructures.forEach(f => {
      if (!f.Term) console.log(`  ⚠️ Fee Structure ID ${f.id} has NO Term!`);
      if (!f.AcademicSession) console.log(`  ⚠️ Fee Structure ID ${f.id} has NO Academic Session!`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchool3Data();
