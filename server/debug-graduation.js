const prisma = require('./db');

async function testGraduation() {
  try {
    console.log('Starting graduation debug...');

    // 1. Get an active student to test with
    const student = await prisma.student.findFirst({
      where: { status: 'active' },
      select: { id: true, admissionNumber: true, classId: true }
    });

    if (!student) {
      console.log('No active students found to test.');
      return;
    }

    console.log(`Testing with Student ID: ${student.id}, Admission: ${student.admissionNumber}`);

    const graduationYear = new Date().getFullYear();
    const studentId = student.id;
    const userId = 1; // Assuming ID 1 is an admin

    // Simulate the transaction logic
    console.log('Attempting transaction...');

    await prisma.$transaction(async (tx) => {
      // Double check student exists in tx
      const s = await tx.student.findUnique({
        where: { id: studentId },
        select: { classId: true, admissionNumber: true }
      });

      console.log('Found student in TX:', s);

      // 1. Update status
      console.log('Updating student status...');
      await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'alumni',
          classId: null
        }
      });

      // 2. Create alumni profile
      const alumniId = `AL/${graduationYear}/${s.admissionNumber}`;
      console.log('Generated Alumni ID:', alumniId);

      console.log('Upserting Alumni...');
      await tx.alumni.upsert({
        where: { studentId },
        update: {
          graduationYear: parseInt(graduationYear),
          alumniId: { set: alumniId }
        },
        create: {
          studentId,
          graduationYear: parseInt(graduationYear),
          alumniId
        }
      });

      // 3. Log history
      console.log('Logging history...');
      await tx.promotionHistory.create({
        data: {
          studentId,
          fromClassId: s.classId,
          toClassId: null,
          academicSessionId: 1, // specific session ID might be needed, using 1 for test or finding active
          type: 'graduation',
          performedBy: userId
        }
      });

      console.log('Transaction step completed for student.');

      // Rolling back to avoid messing up data? 
      // Throw error to rollback
      throw new Error('ROLLBACK_TEST_SUCCESS');
    });

  } catch (error) {
    if (error.message === 'ROLLBACK_TEST_SUCCESS') {
      console.log('Test execution successful (Rolled back changes).');
    } else {
      console.error('Graduation Logic FAILED:');
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testGraduation();
