const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: 'darul' } },
          { username: { contains: 'admin' } }
        ]
      },
      select: { id: true, username: true, schoolId: true, role: true }
    });
    console.log('USERS FOUND:');
    users.forEach(u => console.log(`ID: ${u.id} | Username: ${u.username} | SchoolID: ${u.schoolId} | Role: ${u.role}`));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
