const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        school: true
      }
    });

    console.log('\n👥 USERS IN DATABASE:\n');
    users.forEach(u => {
      console.log(`- ${u.username} (Role: ${u.role}, School ID: ${u.schoolId}, School Name: ${u.school?.name})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
