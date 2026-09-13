const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixParents() {
  console.log('Starting parent-student matching...');
  const students = await prisma.student.findMany({
    where: { parentId: null, parentGuardianPhone: { not: null } }
  });

  let linkedCount = 0;
  for (const student of students) {
    if (!student.parentGuardianPhone) continue;

    // Clean phone number (remove spaces)
    const phone = student.parentGuardianPhone.replace(/\s+/g, '');

    // Find parent by phone
    const parent = await prisma.parent.findFirst({
      where: { phone: phone, schoolId: student.schoolId }
    });

    if (parent) {
      await prisma.student.update({
        where: { id: student.id },
        data: { parentId: parent.id }
      });
      console.log(`Linked Student ${student.admissionNumber} to Parent ${parent.id}`);
      linkedCount++;
    }
  }

  console.log(`Finished matching. Successfully linked ${linkedCount} orphaned students to existing parents. Please tell the user to refresh the page.`);
}

fixParents().catch(console.error).finally(() => prisma.$disconnect());
