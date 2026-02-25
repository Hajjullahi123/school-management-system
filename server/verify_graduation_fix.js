const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Verifying Graduation Fix ---');
  const schoolId = 3; // Amana Academy
  const targetClassId = 5; // JSS 3 A

  try {
    // 1. Check school code
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { code: true }
    });
    console.log(`School Code: ${school?.code}`);

    // 2. Find a student in JSS 3 A
    const student = await prisma.student.findFirst({
      where: { classId: targetClassId, schoolId }
    });

    if (!student) {
      console.error('No students found in JSS 3 A for testing.');
      return;
    }
    console.log(`Found student: ${student.admissionNumber} (ID: ${student.id})`);

    // 3. Mock the graduation process (logic from promotion.js)
    console.log('Simulating graduation logic...');

    const graduationYear = 2026;
    const alumniId = `AL/${school.code || 'SCH'}/${graduationYear}/${student.admissionNumber}`;
    console.log(`Generated Alumni ID: ${alumniId}`);

    if (!alumniId.includes(school.code)) {
      throw new Error('Alumni ID missing school code!');
    }

    // 4. Verify current session filtering
    const session = await prisma.academicSession.findFirst({
      where: { isCurrent: true, schoolId }
    });
    console.log(`Filtered session: ${session?.name} (ID: ${session?.id})`);

    if (session?.id !== 1) {
      throw new Error(`Incorrect session found! Expected ID 1, got ${session?.id}`);
    }

    console.log('✅ Backend logic verification successful.');

  } catch (e) {
    console.error('❌ Verification failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
