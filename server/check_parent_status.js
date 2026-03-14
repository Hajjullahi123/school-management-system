const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParentRecord() {
  try {
    const parentId = 9;
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        user: true,
        school: true
      }
    });

    if (!parent) {
      console.log(`Parent with ID ${parentId} not found.`);
      return;
    }

    console.log('--- Parent Record Details ---');
    console.log(`Parent ID: ${parent.id}`);
    console.log(`School ID: ${parent.schoolId} (${parent.school.name})`);
    console.log(`User ID: ${parent.userId}`);
    console.log(`Phone: ${parent.phone}`);
    console.log(`User Role: ${parent.user.role}`);
    console.log(`User isActive: ${parent.user.isActive}`);
    console.log(`User Username: ${parent.user.username}`);
    console.log(`User Email: ${parent.user.email}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParentRecord();
