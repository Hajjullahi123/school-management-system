const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const schoolId = 3;
    const statusBreakdown = await prisma.student.groupBy({
      by: ['status'],
      where: { schoolId },
      _count: { id: true }
    });

    console.log(`Student status breakdown for School ID ${schoolId}:`);
    console.log(JSON.stringify(statusBreakdown, null, 2));

    const totalStudents = await prisma.student.count({ where: { schoolId } });
    console.log(`Total students: ${totalStudents}`);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
