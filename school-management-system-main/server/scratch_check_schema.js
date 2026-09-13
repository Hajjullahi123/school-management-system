const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const student = await prisma.student.findFirst();
    console.log('Student fields:', Object.keys(student || {}));
    
    const user = await prisma.user.findFirst();
    console.log('User fields:', Object.keys(user || {}));
    
    const dept = await prisma.department.findFirst();
    if (dept) {
      console.log('Department fields:', Object.keys(dept));
    } else {
      console.log('No departments found, but table exists.');
    }
  } catch (error) {
    console.error('Error fetching student:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
