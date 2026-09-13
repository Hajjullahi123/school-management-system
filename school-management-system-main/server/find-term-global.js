const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const terms = await prisma.term.findMany({
      where: { name: { contains: 'Second Term' } },
      include: { academicSession: true, school: { select: { id: true, name: true } } }
    });
    console.log(JSON.stringify(terms, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
