// Restore First Term fee records that were incorrectly deleted
// These students were onboarded to the system on 2026-02-03 but were actually in school during First Term
const prisma = require('./db');
const { createOrUpdateFeeRecordWithOpening } = require('./utils/feeCalculations');

async function restore() {
  console.log('Restoring First Term fee records for students enrolled on 2026-02-03...\n');

  const schoolId = 3; // Amana Academy

  // Get First Term
  const firstTerm = await prisma.term.findFirst({
    where: { name: { contains: 'First' } },
    include: { academicSession: true }
  });

  if (!firstTerm) {
    console.log('First Term not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`First Term: ${firstTerm.name} (ID: ${firstTerm.id}), Session: ${firstTerm.academicSession.name}`);

  // Get fee structure for First Term
  const feeStructures = await prisma.classFeeStructure.findMany({
    where: {
      schoolId,
      termId: firstTerm.id,
      academicSessionId: firstTerm.academicSessionId
    }
  });

  const structureMap = {};
  feeStructures.forEach(fs => {
    structureMap[fs.classId] = fs.amount;
  });

  console.log('Fee structures:', structureMap);

  // Get all active students enrolled on 2026-02-03 (system onboarding date)
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      status: 'active',
      createdAt: {
        gte: new Date('2026-02-03T00:00:00Z'),
        lt: new Date('2026-02-04T00:00:00Z')
      }
    }
  });

  console.log(`Found ${students.length} students enrolled on 2026-02-03\n`);

  let restored = 0;
  for (const student of students) {
    // Check if First Term record already exists
    const existing = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId,
          studentId: student.id,
          termId: firstTerm.id,
          academicSessionId: firstTerm.academicSessionId
        }
      }
    });

    if (!existing) {
      const amount = student.isScholarship ? 0 : (structureMap[student.classId] || 0);
      await createOrUpdateFeeRecordWithOpening({
        schoolId,
        studentId: student.id,
        termId: firstTerm.id,
        academicSessionId: firstTerm.academicSessionId,
        expectedAmount: amount,
        paidAmount: 0
      });
      console.log(`RESTORED: ${student.admissionNumber} | First Term | Expected: ${amount}`);
      restored++;
    }
  }

  // Also restore for students enrolled on 2026-02-26
  const lateStudents = await prisma.student.findMany({
    where: {
      schoolId,
      status: 'active',
      createdAt: {
        gte: new Date('2026-02-26T00:00:00Z'),
        lt: new Date('2026-02-27T00:00:00Z')
      }
    }
  });

  for (const student of lateStudents) {
    const existing = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId,
          studentId: student.id,
          termId: firstTerm.id,
          academicSessionId: firstTerm.academicSessionId
        }
      }
    });

    if (!existing) {
      const amount = student.isScholarship ? 0 : (structureMap[student.classId] || 0);
      await createOrUpdateFeeRecordWithOpening({
        schoolId,
        studentId: student.id,
        termId: firstTerm.id,
        academicSessionId: firstTerm.academicSessionId,
        expectedAmount: amount,
        paidAmount: 0
      });
      console.log(`RESTORED: ${student.admissionNumber} | First Term | Expected: ${amount}`);
      restored++;
    }
  }

  // Also restore for AAM/RA/2026/089 enrolled 2026-03-03
  const student089 = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/RA/2026/089', schoolId }
  });
  if (student089) {
    const existing = await prisma.feeRecord.findUnique({
      where: {
        schoolId_studentId_termId_academicSessionId: {
          schoolId,
          studentId: student089.id,
          termId: firstTerm.id,
          academicSessionId: firstTerm.academicSessionId
        }
      }
    });
    if (!existing) {
      const amount = student089.isScholarship ? 0 : (structureMap[student089.classId] || 0);
      await createOrUpdateFeeRecordWithOpening({
        schoolId,
        studentId: student089.id,
        termId: firstTerm.id,
        academicSessionId: firstTerm.academicSessionId,
        expectedAmount: amount,
        paidAmount: 0
      });
      console.log(`RESTORED: ${student089.admissionNumber} | First Term | Expected: ${amount}`);
      restored++;
    }
  }

  console.log(`\nTotal restored: ${restored}`);

  // Also need to restore Second Term for AAM/2026/JSS2A/020
  const student020 = await prisma.student.findFirst({
    where: { admissionNumber: 'AAM/2026/JSS2A/020', schoolId }
  });
  if (student020) {
    const secondTerm = await prisma.term.findFirst({
      where: { name: { contains: 'Second' }, academicSessionId: firstTerm.academicSessionId }
    });
    if (secondTerm) {
      const existing = await prisma.feeRecord.findUnique({
        where: {
          schoolId_studentId_termId_academicSessionId: {
            schoolId,
            studentId: student020.id,
            termId: secondTerm.id,
            academicSessionId: secondTerm.academicSessionId
          }
        }
      });
      if (!existing) {
        const amount = student020.isScholarship ? 0 : (structureMap[student020.classId] || 0);
        await createOrUpdateFeeRecordWithOpening({
          schoolId,
          studentId: student020.id,
          termId: secondTerm.id,
          academicSessionId: secondTerm.academicSessionId,
          expectedAmount: amount,
          paidAmount: 0
        });
        console.log(`RESTORED: ${student020.admissionNumber} | Second Term | Expected: ${amount}`);
      }
    }
  }

  await prisma.$disconnect();
}

restore();
