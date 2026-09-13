const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJSS2B() {
  const schoolId = 3; // Amana Academy
  const term = await prisma.term.findFirst({ where: { schoolId, isCurrent: true } });

  if (!term) {
    console.log("Current term not found");
    return;
  }

  const jss2b = await prisma.class.findFirst({
    where: { schoolId, name: 'JSS 2', arm: 'B' }
  });

  if (!jss2b) {
    console.log("JSS 2B class not found");
    return;
  }

  console.log(`Class: ${jss2b.name} ${jss2b.arm} (ID: ${jss2b.id})`);

  const structure = await prisma.classFeeStructure.findFirst({
    where: { classId: jss2b.id, termId: term.id }
  });

  console.log(`Structure for Class ${jss2b.id}, Term ${term.id}: ${structure ? structure.amount : 'MISSING'}`);

  const students = await prisma.student.findMany({
    where: { classId: jss2b.id, status: 'active' },
    include: {
      user: true,
      feeRecords: {
        where: { termId: term.id }
      }
    }
  });

  console.log(`Found ${students.length} students in JSS 2B`);
  students.forEach(s => {
    console.log(`- ${s.user.firstName} ${s.user.lastName} (Scholarship: ${s.isScholarship})`);
    if (s.feeRecords.length > 0) {
      console.log(`  Fee Record: Expected=${s.feeRecords[0].expectedAmount}, Balance=${s.feeRecords[0].balance}`);
    } else {
      console.log(`  NO FEE RECORD FOUND`);
    }
  });

  await prisma.$disconnect();
}

checkJSS2B();
