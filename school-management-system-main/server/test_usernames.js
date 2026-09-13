const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAdminUsername, generateTeacherUsername, generateStudentUsername } = require('./utils/usernameGenerator');

async function testPatterns() {
  try {
    console.log('--- Testing Username Generation Patterns ---');

    const schoolId = 1;
    const schoolCode = 'AMA';
    const year = 2026;

    // Test Admin Username
    const adminUname = await generateAdminUsername(schoolId, schoolCode, year);
    console.log(`Admin Username (Expected: admin-ama-2026): ${adminUname}`);

    // Test Teacher Username
    const teacherUname = await generateTeacherUsername(schoolId, schoolCode, 'John', 'Doe', 2026);
    console.log(`Teacher Username (Expected: AMA/JD/2026/0XX): ${teacherUname}`);

    // Test Student Username
    const studentUname = await generateStudentUsername(schoolId, schoolCode, 'Alice', 'Smith', 2026);
    console.log(`Student Username (Expected: AMA/AS/2026/0XX): ${studentUname}`);

    // Test sequence numbering for student
    const studentUname2 = await generateStudentUsername(schoolId, schoolCode, 'Bob', 'Johnson', 2026);
    console.log(`Student Username 2 (Expected: sequence change): ${studentUname2}`);

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPatterns();
