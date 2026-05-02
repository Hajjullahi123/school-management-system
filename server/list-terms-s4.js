const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = 4;
  try {
    const terms = await prisma.term.findMany({
      where: { schoolId },
      include: { academicSession: true }
    });
    console.log(JSON.stringify(terms, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
