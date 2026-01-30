const prisma = require('./db');
const { calculatePreviousOutstanding } = require('./utils/feeCalculations');

async function simulateFeeApi() {
  const schoolId = 3;
  const termId = 2; // Current term for School 3
  const academicSessionId = 1; // Current session for School 3

  try {
    console.log(`\n🚀 SIMULATING /api/fees/students FOR SCHOOL ${schoolId}, TERM ${termId}, SESSION ${academicSessionId}\n`);

    const where = { schoolId, status: 'active' };

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        classModel: true,
        feeRecords: {
          where: {
            termId,
            academicSessionId
          }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });

    console.log(`👨‍🎓 Students found: ${students.length}`);

    const feeStructures = await prisma.classFeeStructure.findMany({
      where: {
        schoolId,
        termId,
        academicSessionId
      }
    });

    const structureMap = {};
    feeStructures.forEach(fs => {
      structureMap[fs.classId] = fs.amount;
    });

    console.log(`💰 Fee structures found: ${feeStructures.length}`);

    const processedStudents = await Promise.all(students.map(async (student) => {
      if (student.feeRecords && student.feeRecords.length > 0) {
        return {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          hasRecord: true,
          record: student.feeRecords[0]
        };
      }

      const expected = student.isScholarship ? 0 : (structureMap[student.classId] || 0);
      const arrears = await calculatePreviousOutstanding(
        schoolId,
        student.id,
        academicSessionId,
        termId
      );

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        hasRecord: false,
        virtualExpected: expected,
        virtualArrears: arrears
      };
    }));

    console.log('\n📊 PROCESSED STUDENTS:');
    processedStudents.forEach(ps => {
      console.log(`- ${ps.name} (ID: ${ps.id})`);
      if (ps.hasRecord) {
        console.log(`  Record Found: Expected=${ps.record.expectedAmount}, Paid=${ps.record.paidAmount}, Bal=${ps.record.balance}`);
      } else {
        console.log(`  VIRTUAL: Expected=${ps.virtualExpected}, Arrears=${ps.virtualArrears}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateFeeApi();
