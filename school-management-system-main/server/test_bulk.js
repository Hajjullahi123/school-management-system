const prisma = require('./db');

async function test() {
  try {
    const classId = 3;
    const termId = 1553;
    
    const user = await prisma.user.findFirst({ where: { firstName: 'Abdullahi', lastName: 'Lawal' }});
    console.log('User found:', user?.id, 'School:', user?.schoolId);
    
    if(!user) return;
    const schoolId = user.schoolId;

    // Fetch school settings
    const schoolSettings = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        gradingSystem: true, passThreshold: true,
        assignment1Weight: true, assignment2Weight: true,
        test1Weight: true, test2Weight: true,
        examWeight: true,
        principalSignatureUrl: true,
        weekendDays: true,
        showAttendanceOnReport: true,
        reportLayout: true,
        reportColorScheme: true,
        reportFontFamily: true,
        showPositionOnReport: true,
        showFeesOnReport: true,
        showPassFailStats: true
      }
    });

    console.log('School settings:', !!schoolSettings);

    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId: schoolId },
      include: { academicSession: true }
    });
    console.log('Term:', !!term);

    // Fetch all active students in class
    let studentWhere = { classId: parseInt(classId), schoolId: schoolId, status: 'active' };
    let students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { firstName: true, lastName: true, photoUrl: true } },
        classModel: {
          include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });
    console.log('Students found:', students.length);

    if (students.length === 0) return;

    // Simulate fee logic
    const studentIds = students.map(s => s.id);
    const allFeeRecords = await prisma.feeRecord.findMany({
      where: { schoolId: schoolId, studentId: { in: studentIds } },
      include: { term: { select: { id: true, startDate: true } } }
    });
    console.log('Fee records:', allFeeRecords.length);

    // Fetch psychomotor domains
    const psychomotorDomains = await prisma.psychomotorDomain.findMany({
      where: { schoolId: schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });
    console.log('Psychomotor domains:', psychomotorDomains.length);

    // Fetch results
    const allResults = await prisma.result.findMany({
      where: { 
        studentId: { in: students.map(s => s.id) }, 
        termId: parseInt(termId), 
        schoolId: schoolId 
      },
      include: { subject: true }
    });
    console.log('All results:', allResults.length);

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: schoolId },
      include: { subject: true }
    });
    console.log('Class subjects:', classSubjects.length);

    console.log('Success, no errors thrown.');

  } catch (e) {
    console.error('Test script error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
