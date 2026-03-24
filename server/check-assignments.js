const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    include: {
      teacherAssignments: {
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true
            }
          }
        }
      }
    }
  });

  const summary = teachers.map(t => ({
    id: t.id,
    name: `${t.firstName} ${t.lastName}`,
    assignmentsCount: t.teacherAssignments.length,
    assignments: t.teacherAssignments.map(a => `${a.classSubject.class.name} - ${a.classSubject.subject.name}`)
  }));

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
