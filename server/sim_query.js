const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 75; // Fatima Musa
  const schoolId = 3;

  console.log(`Simulating query for userId=${userId}, schoolId=${schoolId}`);

  const classData = await prisma.class.findFirst({
    where: {
      classTeacherId: userId,
      schoolId: schoolId,
      isActive: true
    },
    include: {
      students: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true
            }
          }
        }
      }
    }
  });

  if (classData) {
    console.log(`SUCCESS: Found class ${classData.name} ${classData.arm || ''} (ID: ${classData.id})`);
    console.log(`Student count: ${classData.students.length}`);
  } else {
    console.log('FAIL: No class found.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
