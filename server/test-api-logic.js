
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  try {
    const JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"; // From .env

    // 1. Get admin user
    const user = await prisma.user.findFirst({
      where: { username: 'admin', schoolId: 3 }
    });

    if (!user) {
      console.log('AMA-admin not found');
      return;
    }

    console.log('Found user:', user.username, 'SchoolID:', user.schoolId);

    // 2. Mock what the route would do
    const schoolId = user.schoolId;
    const where = { schoolId, status: 'active' };

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, username: true }
        },
        classModel: {
          select: { id: true, name: true, arm: true }
        }
      }
    });

    console.log('Result count for School 3 (active):', students.length);

    // 3. Check classes
    const classes = await prisma.class.findMany({
      where: { schoolId, isActive: true }
    });
    console.log('Active classes count:', classes.length);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
