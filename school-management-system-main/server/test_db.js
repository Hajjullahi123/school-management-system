const prisma = require('./db');

async function main() {
  const term = await prisma.term.findFirst({
    where: { isCurrent: true },
    include: { academicSession: true }
  });
  console.log('Current Term:', term);

  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true }
  });
  console.log('Current Session:', session);

  const assignments = await prisma.teacherAssignment.findMany({
    include: {
      teacher: true,
      classSubject: {
        include: { subject: true, class: true }
      }
    }
  });
  console.log('Assignments:', assignments.length);
  console.log(assignments.map(a => a.teacher.username + ' -> ' + a.classSubject.class.name + ' - ' + a.classSubject.subject.name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
