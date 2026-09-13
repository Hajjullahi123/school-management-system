const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const student = await prisma.student.findFirst({
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        classModel: true,
        school: true
      }
    });
    console.log('[VERIFY] Prisma query success:', !!student);
    if (student) {
      console.log(`[VERIFY] Student ID: ${student.id}, Middle Name: ${student.middleName || 'N/A'}`);
    }
  } catch (e) {
    console.error('[VERIFY] Query failure:', e.message);
    process.exit(1);
  }
}

verify().finally(() => prisma.$disconnect());
