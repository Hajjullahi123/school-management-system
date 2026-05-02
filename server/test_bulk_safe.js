const prisma = require('./db');
async function test() {
  try {
    const classId = 3;
    const termId = 1553;
    
    const user = await prisma.user.findFirst({ where: { firstName: 'Abdullahi', lastName: 'Lawal' }});
    console.log('User found:', user?.id, 'School:', user?.schoolId);
    
    if(!user) return;
    const schoolId = user.schoolId;

    const classInfo = await prisma.class.findFirst({
      where: { id: parseInt(classId), schoolId: schoolId },
      select: { classTeacherId: true, showPositionOnReport: true, showFeesOnReport: true, showAttendanceOnReport: true, reportLayout: true }
    });

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

    const term = await prisma.term.findFirst({
      where: { id: parseInt(termId), schoolId: schoolId },
      include: { academicSession: true }
    });

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

    const studentIds = students.map(s => s.id);
    if(studentIds.length === 0) { console.log('No students found'); return; }

    const allTermsInSession = await prisma.term.findMany({
      where: { academicSessionId: term.academicSessionId, schoolId: schoolId },
      orderBy: { startDate: 'asc' }
    });

    const termIndex = allTermsInSession.findIndex(t => t.id === parseInt(termId));
    const isFinalTerm = termIndex === allTermsInSession.length - 1;
    const totalTerms = allTermsInSession.length;

    let allPreviousResults = [];
    if (isFinalTerm && totalTerms > 1) {
      allPreviousResults = await prisma.result.findMany({
        where: {
          schoolId: schoolId,
          studentId: { in: studentIds },
          academicSessionId: term.academicSessionId,
          termId: { not: parseInt(termId) }
        }
      });
    }

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: parseInt(classId), schoolId: schoolId },
      include: { subject: true }
    });

    const allResults = await prisma.result.findMany({
      where: {
        studentId: { in: studentIds },
        termId: parseInt(termId),
        schoolId: schoolId
      },
      include: { subject: true }
    });

    const resultsSummary = await prisma.result.groupBy({
      by: ['studentId'],
      where: {
        classId: parseInt(classId), termId: parseInt(termId), schoolId: schoolId,
        student: { status: 'active' }
      },
      _sum: { totalScore: true },
      _count: { subjectId: true }
    });

    const allFeeRecords = await prisma.feeRecord.findMany({
      where: { schoolId: schoolId, studentId: { in: studentIds } },
      include: { Term: { select: { id: true, startDate: true } } }
    });

    const allFeeStructures = await prisma.classFeeStructure.findMany({
      where: { schoolId: schoolId, classId: parseInt(classId), academicSessionId: term.academicSessionId }
    });

    const attendanceCounts = await prisma.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        schoolId: schoolId, classId: parseInt(classId), termId: parseInt(termId),
        status: { in: ['present', 'late'] }
      },
      _count: { id: true }
    });

    console.log('Queries executed without error.');
  } catch (e) {
    console.error('Test script error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
