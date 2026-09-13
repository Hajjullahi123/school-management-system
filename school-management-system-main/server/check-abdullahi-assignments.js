const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacher: {
        OR: [
          { firstName: 'Abdullahi' },
          { lastName: 'Lawal' }
        ]
      }
    },
    include: {
      teacher: true,
      classSubject: {
        include: {
          class: true,
          subject: true
        }
      }
    }
  });

  console.log(JSON.stringify(assignments.map(a => ({
    teacher: `${a.teacher.firstName} ${a.teacher.lastName}`,
    role: a.teacher.role,
    schoolId: a.teacher.schoolId,
    class: a.classSubject.class.name,
    subject: a.classSubject.subject.name
  })), null, 2));
}

main()
  .catch((e) => {
    process.exit(1);
  });
