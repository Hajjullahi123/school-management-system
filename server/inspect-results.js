const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const results = await prisma.result.findMany({
      where: { schoolId: 3 },
      include: {
        student: { select: { id: true, admissionNumber: true, schoolId: true } },
        class: { select: { id: true, name: true, schoolId: true } },
        subject: { select: { id: true, name: true, schoolId: true } }
      }
    });
    console.log('Results for School 3 (Amana):');
    console.log(JSON.stringify(results, null, 2));

    const mismatched = await prisma.result.findMany({
      where: { schoolId: 3 },
      include: { student: true }
    });

    const countMismatched = mismatched.filter(r => r.student.schoolId !== 3).length;
    console.log('\nResults for School 3 linked to students of OTHER schools:', countMismatched);

    const school5Results = await prisma.result.findMany({
      where: { schoolId: 5 },
      include: { student: true }
    });
    console.log('\nResults for School 5 (Demo Academy):', school5Results.length);
    const countMismatched5 = school5Results.filter(r => r.student.schoolId !== 5).length;
    console.log('Results for School 5 linked to students of OTHER schools:', countMismatched5);

    if (countMismatched5 > 0) {
      const samples = school5Results.filter(r => r.student.schoolId !== 5).slice(0, 5);
      console.log('Samples of mismatched results in School 5:', JSON.stringify(samples.map(s => ({
        id: s.id,
        studentSchoolId: s.student.schoolId,
        studentAdmission: s.student.admissionNumber
      })), null, 2));
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
