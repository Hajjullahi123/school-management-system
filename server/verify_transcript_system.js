const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Verifying Secure Transcript System ---');
  const studentId = 99; // Amana Academy student with results

  try {
    // 1. Test Transcript Aggregation Logic
    console.log(`\n1. Testing aggregation for student ID ${studentId}...`);
    const results = await prisma.result.findMany({
      where: { studentId },
      include: {
        subject: true,
        academicSession: true,
        term: true
      }
    });

    console.log(`Found ${results.length} results.`);
    if (results.length === 0) {
      console.warn('⚠️ No results found for this student. Seeding might be needed for full test.');
    } else {
      const sessions = {};
      results.forEach(r => {
        const sName = r.academicSession.name;
        if (!sessions[sName]) sessions[sName] = [];
        sessions[sName].push(r.subject.name);
      });
      console.log('Grouped by session:', Object.keys(sessions));
    }

    // 2. Test Public Verification Logic
    console.log(`\n2. Testing public verification for student ID ${studentId}...`);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        school: true,
        alumni: true
      }
    });

    if (student) {
      console.log('✅ Student found:', student.user.firstName, student.user.lastName);
      console.log('✅ School:', student.school.name);
      console.log('✅ Status:', student.status);
      console.log('✅ Graduation Year:', student.alumni?.graduationYear || 'N/A');
    } else {
      throw new Error(`Student ${studentId} not found in database.`);
    }

    console.log('\n✅ Backend logic verification successful.');

  } catch (e) {
    console.error('❌ Verification failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
