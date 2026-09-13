const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateGetParentsApi() {
  try {
    const schoolId = 3;
    console.log(`Simulating GET /api/parents for schoolId: ${schoolId}`);

    const parents = await prisma.parent.findMany({
      where: { schoolId: schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, username: true, role: true } },
        students: {
          where: { schoolId: schoolId },
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: { select: { name: true, arm: true } }
          }
        }
      }
    });

    console.log(`API returned ${parents.length} parents.`);

    const target = parents.find(p => p.id === 1);
    if (target) {
      console.log('--- Found Abdullahi Lawal in API Response ---');
      console.log(`Name: ${target.user.firstName} ${target.user.lastName}`);
      console.log(`Role: ${target.user.role}`);
      console.log(`Students: ${target.students.map(s => s.user.firstName).join(', ')}`);
    } else {
      console.log('--- Abdullahi Lawal NOT found in API Response ---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateGetParentsApi();
