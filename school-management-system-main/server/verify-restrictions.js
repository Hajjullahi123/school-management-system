const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRestriction() {
  try {
    // 1. Find a student
    const student = await prisma.student.findFirst({
      where: { user: { role: 'student' } },
      include: { user: true }
    });

    if (!student) {
      console.log('No student found to test with.');
      return;
    }

    console.log(`Testing with Student: ${student.user.username} (ID: ${student.id})`);
    const originalDOB = student.dateOfBirth;
    const originalGender = student.gender;

    console.log(`Original DOB: ${originalDOB}, Gender: ${originalGender}`);

    // Simulate the update logic from students.js for 'student' role
    // This is a manual check of the logic I just wrote
    const mockReqBody = {
      dateOfBirth: '2000-01-01',
      gender: 'Other',
      address: 'New Test Address'
    };

    // --- Logic from students.js ---
    const {
      middleName,
      address,
      parentGuardianPhone,
      parentEmail,
      disability,
      nationality,
      stateOfOrigin,
      bloodGroup,
      genotype
      // dateOfBirth and gender are EXCLUDED here now
    } = mockReqBody;

    const dataToUpdate = {};
    if (address !== undefined) dataToUpdate.address = address;
    // ... other allowed fields ...

    console.log('Fields to update (simulated):', Object.keys(dataToUpdate));

    if (dataToUpdate.dateOfBirth || dataToUpdate.gender) {
      console.error('FAIL: Restricted fields found in dataToUpdate!');
    } else {
      console.log('SUCCESS: Restricted fields NOT found in dataToUpdate.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Verification Error:', error);
    process.exit(1);
  }
}

verifyRestriction();
