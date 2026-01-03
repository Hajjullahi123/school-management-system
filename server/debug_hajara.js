const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findFirst({ where: { firstName: 'Hajara' } });

  // Find assignment
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: teacher.id },
    include: { class: true, subject: true }
  });

  console.log(`Assignments for Hajara (${teacher.id}):`);
  for (const assign of assignments) {
    console.log(`- Class: ${assign.class.name} (ID: ${assign.classId}), Subject: ${assign.subject.name}`);

    // Check students in this class
    const students = await prisma.student.findMany({
      where: { classId: assign.classId },
      include: { user: true }
    });
    console.log(`  Students in class (${students.length}):`);
    students.forEach(s => console.log(`   * ${s.user.firstName} ${s.user.lastName} (ID: ${s.id})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
