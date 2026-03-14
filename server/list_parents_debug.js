const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllParents() {
  try {
    const schoolId = 3;
    const parents = await prisma.parent.findMany({
      where: { schoolId: schoolId },
      include: {
        user: true,
        students: true
      }
    });

    console.log(`Found ${parents.length} parents in School ID ${schoolId}:`);
    parents.forEach((p, i) => {
      console.log(`[${i + 1}] Parent ID: ${p.id}, User ID: ${p.userId}, Name: ${p.user.firstName} ${p.user.lastName}, Role: ${p.user.role}, Phone: ${p.phone}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllParents();
