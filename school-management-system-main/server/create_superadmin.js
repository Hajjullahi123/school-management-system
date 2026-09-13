const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const password = 'superadmin123';
  const passwordHash = await bcrypt.hash(password, 12);

  // Use School ID 1 (Default School) for the first superadmin
  const user = await prisma.user.upsert({
    where: {
      schoolId_username: {
        schoolId: 1,
        username: 'superadmin'
      }
    },
    update: {
      role: 'superadmin',
      passwordHash: passwordHash
    },
    create: {
      username: 'superadmin',
      passwordHash: passwordHash,
      email: 'superadmin@system.com',
      role: 'superadmin',
      firstName: 'Global',
      lastName: 'Superadmin',
      schoolId: 1
    }
  });

  console.log('Super Admin user created/updated successfully!');
  console.log('Username: superadmin');
  console.log('Password: superadmin123');
  console.log('Role:', user.role);

  await prisma.$disconnect();
}

createSuperAdmin();
