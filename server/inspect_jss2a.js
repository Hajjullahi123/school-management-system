const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({
    where: {
      name: 'JSS 2',
      arm: 'A'
    },
    include: {
      classTeacher: true
    }
  });

  console.log('--- JSS 2 A Detailed Status ---');
  if (classes.length === 0) {
    console.log('Class JSS 2 A not found!');
  } else {
    classes.forEach(c => {
      console.log(`ID: ${c.id}`);
      console.log(`Name: ${c.name}`);
      console.log(`Arm: ${c.arm}`);
      console.log(`Is Active: ${c.isActive}`);
      console.log(`Teacher ID: ${c.classTeacherId}`);
      if (c.classTeacher) {
        console.log(`Teacher Name: ${c.classTeacher.firstName} ${c.classTeacher.lastName} (${c.classTeacher.username})`);
      } else {
        console.log('Teacher: NOT ASSIGNED');
      }
    });
  }

  // Also check all classes assigned to fatima.musa
  const fatima = await prisma.user.findFirst({
    where: { username: 'fatima.musa' },
    include: {
      classesAsTeacher: true
    }
  });

  if (fatima) {
    console.log(`\n--- Fatima Musa (fatima.musa) [ID: ${fatima.id}] ---`);
    console.log(`Classes assigned (classesAsTeacher): ${fatima.classesAsTeacher.length}`);
    fatima.classesAsTeacher.forEach(c => {
      console.log(`  - ${c.name} ${c.arm} (ID: ${c.id}, Active: ${c.isActive})`);
    });
  } else {
    console.log('\nUser fatima.musa not found!');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
