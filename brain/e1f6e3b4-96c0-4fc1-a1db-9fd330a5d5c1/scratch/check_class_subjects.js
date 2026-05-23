const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeTerm = await prisma.term.findFirst({
    where: { isCurrent: true }
  });
  console.log('Active Term:', activeTerm);

  const classSubjects = await prisma.classSubject.findMany({
    include: {
      class: true,
      subject: true,
      teacherAssignments: {
        where: {
          termId: activeTerm ? activeTerm.id : undefined
        }
      }
    }
  });

  console.log(`Found ${classSubjects.length} class subjects.`);
  classSubjects.forEach(cs => {
    console.log(`Class: ${cs.class.name}, Subject: ${cs.subject.name}, Assignments: ${cs.teacherAssignments.length}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
