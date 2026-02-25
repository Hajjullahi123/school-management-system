const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    const user = await prisma.user.findFirst({
      where: { username: 'aundefineda-admin', schoolId: 3 }
    });

    if (user) {
      console.log('Found corrupted user. Updating to "admin"...');
      await prisma.user.update({
        where: { id: user.id },
        data: { username: 'admin' }
      });
      console.log('Update successful.');
    } else {
      console.log('Corrupted admin user not found.');
      // Just in case check if 'admin' already exists
      const existing = await prisma.user.findFirst({
        where: { username: 'admin', schoolId: 3 }
      });
      if (existing) {
        console.log('"admin" already exists for School 3.');
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
