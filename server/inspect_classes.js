const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({
    include: {
      classTeacher: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  console.log('--- Classes and Teachers ---');
  classes.forEach(c => {
    console.log(`Class: ${c.name} ${c.arm || ''} (ID: ${c.id})`);
    if (c.classTeacher) {
      console.log(`  Form Master: ${c.classTeacher.firstName} ${c.classTeacher.lastName} (${c.classTeacher.username}) [ID: ${c.classTeacher.id}]`);
    } else {
      console.log('  Form Master: None');
    }
  });

  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    include: {
      classesAsTeacher: true
    }
  });

  console.log('\n--- Teachers and their Assigned Classes (via User.classesAsTeacher) ---');
  teachers.forEach(t => {
    console.log(`Teacher: ${t.firstName} ${t.lastName} (${t.username}) [ID: ${t.id}]`);
    if (t.classesAsTeacher && t.classesAsTeacher.length > 0) {
      t.classesAsTeacher.forEach(c => {
        console.log(`  Assigned Class: ${c.name} ${c.arm || ''}`);
      });
    } else {
      console.log('  Assigned Classes: None');
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
