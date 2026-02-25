const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    include: { user: true }
  });
  if (!student) {
    console.log('No students found');
  } else {
    console.log(JSON.stringify(student, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
