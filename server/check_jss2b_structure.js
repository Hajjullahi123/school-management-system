const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStructure() {
  const schoolId = 3;
  const currentTerm = await prisma.term.findFirst({
    where: { isCurrent: true, schoolId },
    include: { academicSession: true }
  });

  if (!currentTerm) {
    console.log("No current term");
    return;
  }

  console.log(`Current Term: ${currentTerm.name} (ID: ${currentTerm.id}), Session ID: ${currentTerm.academicSessionId}`);

  const classId = 4; // JSS 2B
  const feeStructure = await prisma.classFeeStructure.findUnique({
    where: {
      schoolId_classId_termId_academicSessionId: {
        schoolId: schoolId,
        classId: classId,
        termId: currentTerm.id,
        academicSessionId: currentTerm.academicSessionId
      }
    }
  });

  console.log('Fee Structure for JSS 2B:', feeStructure);

  const allStructures = await prisma.classFeeStructure.findMany({
    where: { schoolId, classId }
  });
  console.log('All structures for JSS 2B:', allStructures);

  await prisma.$disconnect();
}

checkStructure();
