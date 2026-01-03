const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get Teacher Hajara
  const teacher = await prisma.user.findFirst({
    where: { firstName: 'Hajara' }
  });
  if (!teacher) throw new Error("Teacher Hajara not found");
  console.log(`Found teacher: ${teacher.firstName} (ID: ${teacher.id})`);

  // 2. Get/Create a Subject (Mathematics) and Class (JSS 1 A)
  let subject = await prisma.subject.findFirst({ where: { code: 'MATH' } });
  if (!subject) subject = await prisma.subject.create({ data: { name: 'Mathematics', code: 'MATH', category: 'General' } });

  let cls = await prisma.class.findFirst({ where: { name: 'JSS 1' } }); // Assuming JSS 1 exists
  if (!cls) cls = await prisma.class.create({ data: { name: 'JSS 1' } });

  const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });

  // 3. Ensure Assignment Exists
  const assignment = await prisma.teacherAssignment.upsert({
    where: {
      teacherId_subjectId_classId: {
        teacherId: teacher.id,
        subjectId: subject.id,
        classId: cls.id
      }
    },
    update: {},
    create: {
      teacherId: teacher.id,
      subjectId: subject.id,
      classId: cls.id
    }
  });
  console.log('Assignment ensured: Hajara -> Math -> JSS 1');

  // 4. Ensure a Demo Student Exists
  const demoStudentUser = await prisma.user.upsert({
    where: { username: 'demo-student' },
    update: {},
    create: {
      username: 'demo-student',
      passwordHash: 'hash', // dummy
      firstName: 'Demo',
      lastName: 'Student',
      role: 'student'
    }
  });

  const demoStudent = await prisma.student.upsert({
    where: { userId: demoStudentUser.id },
    update: { classId: cls.id },
    create: {
      userId: demoStudentUser.id,
      admissionNumber: 'DEMO-001',
      classId: cls.id,
      gender: 'Male',
      dateOfBirth: new Date()
    }
  });
  console.log('Student ensured: Demo Student (JSS 1)');

  // 5. Ensure Result Exists (Score 40)
  const result = await prisma.result.upsert({
    where: {
      studentId_subjectId_termId_academicSessionId: {
        studentId: demoStudent.id,
        subjectId: subject.id,
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      }
    },
    update: { totalScore: 40, examScore: 40, grade: 'E' }, // Reset to 40 for demo
    create: {
      studentId: demoStudent.id,
      subjectId: subject.id,
      termId: currentTerm.id,
      academicSessionId: currentSession.id,
      classId: cls.id,
      examScore: 40,
      totalScore: 40,
      grade: 'E',
      isSubmitted: true
    }
  });
  console.log('Result ensured: Score 40');

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
