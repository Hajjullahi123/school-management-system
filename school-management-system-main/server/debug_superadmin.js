require('dotenv').config({ path: './server/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSuperadmin() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'superadmin' },
      include: { school: true }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error fetching superadmins:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperadmin();
