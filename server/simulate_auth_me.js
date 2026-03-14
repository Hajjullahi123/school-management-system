const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 75; // Fatima Musa
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      school: true,
      student: {
        include: {
          classModel: true
        }
      },
      teacher: {
        include: {
          school: true
        }
      },
      classesAsTeacher: {
        where: { isActive: true },
        select: { id: true, name: true, arm: true }
      },
      parent: {
        include: {
          students: {
            include: {
              classModel: true
            }
          }
        }
      }
    }
  });

  console.log('--- Auth Me Simulation Output ---');
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
