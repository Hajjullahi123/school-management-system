const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClasses() {
  const schoolId = 3;
  const classes = await prisma.class.findMany({
    where: { schoolId }
  });
  console.log('Classes for School 3:');
  classes.forEach(c => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, Arm: ${c.arm}, IsActive: ${c.isActive}`);
  });
  await prisma.$disconnect();
}

checkClasses();
