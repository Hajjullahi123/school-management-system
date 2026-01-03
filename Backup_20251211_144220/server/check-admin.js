const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (admin) {
      console.log('Admin user FOUND:', admin.username);
      console.log('Role:', admin.role);
      console.log('Is Active:', admin.isActive);
    } else {
      console.log('Admin user NOT FOUND');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
