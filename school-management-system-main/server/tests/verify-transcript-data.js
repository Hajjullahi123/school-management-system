const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTranscript(studentId) {
  console.log(`Starting verification for Student ID: ${studentId}`);

  try {
    // 1. Get student & school details
    const student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        classModel: true,
        school: true
      }
    });

    if (!student) {
      console.error('FAIL: Student not found');
      return;
    }
    console.log(`SUCCESS: Found student ${student.user.firstName} ${student.user.lastName}`);

    // 2. Get all results
    const results = await prisma.result.findMany({
      where: { studentId, schoolId: student.schoolId },
      include: {
        subject: { select: { name: true, code: true } },
        academicSession: { select: { name: true, id: true } },
        term: { select: { name: true, id: true } }
      },
      orderBy: [
        { academicSessionId: 'asc' },
        { termId: 'asc' }
      ]
    });

    console.log(`INFO: Found ${results.length} results`);

    // 3. Grouping logic (replicating promotion.js)
    const sessions = {};
    results.forEach(r => {
      const sName = r.academicSession.name;
      const tName = r.term.name;

      if (!sessions[sName]) sessions[sName] = {};
      if (!sessions[sName][tName]) sessions[sName][tName] = { results: [], average: 0 };

      sessions[sName][tName].results.push({
        subject: r.subject.name,
        code: r.subject.code,
        score: r.totalScore,
        grade: r.grade,
        position: r.positionInClass
      });
    });

    // Calculate averages per term
    Object.keys(sessions).forEach(sKey => {
      Object.keys(sessions[sKey]).forEach(tKey => {
        const term = sessions[sKey][tKey];
        const sum = term.results.reduce((acc, curr) => acc + curr.score, 0);
        term.average = term.results.length > 0 ? (sum / term.results.length).toFixed(2) : 0;
      });
    });

    // 4. Assertions
    if (Object.keys(sessions).length === 0 && results.length > 0) {
      console.error('FAIL: Results found but sessions not grouped correctly');
    } else {
      console.log('SUCCESS: Grouping logic passed');
      console.log('Grouping Summary:', JSON.stringify(Object.keys(sessions), null, 2));
    }

    // Check a sample average
    if (Object.keys(sessions).length > 0) {
      const firstSession = Object.keys(sessions)[0];
      const firstTerm = Object.keys(sessions[firstSession])[0];
      console.log(`INFO: Sample Average (${firstSession} - ${firstTerm}): ${sessions[firstSession][firstTerm].average}`);
    }

  } catch (error) {
    console.error('FAIL: Unexpected error during verification', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run for Student 1
verifyTranscript(1);
