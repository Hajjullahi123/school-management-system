const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allClassSubjects = await prisma.classSubject.findMany({
    include: {
      class: true,
      subject: true
    }
  });

  console.log('Class Subjects:');
  allClassSubjects.forEach(cs => {
    console.log(`- ${cs.subject.name} (ID: ${cs.subjectId}) assigned to ${cs.class.name} ${cs.class.arm || ''} (ID: ${cs.classId})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
