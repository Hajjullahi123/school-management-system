const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParentByUser() {
  try {
    const userId = 9;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: {
          include: {
            school: true
          }
        }
      }
    });

    if (!user) {
      console.log(`User with ID ${userId} not found.`);
      return;
    }

    console.log('--- User Details ---');
    console.log(`User ID: ${user.id}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log(`Username: ${user.username}`);

    if (user.parent) {
      console.log('--- Parent Record ---');
      console.log(`Parent ID: ${user.parent.id}`);
      console.log(`Parent Phone: ${user.parent.phone}`);
      console.log(`Parent School ID: ${user.parent.schoolId} (${user.parent.school.name})`);
    } else {
      console.log('No linked Parent record for this user.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParentByUser();
