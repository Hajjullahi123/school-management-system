const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing SaaS Multi-Tenancy ---');

  // 1. Create Default School
  const school = await prisma.school.create({
    data: {
      slug: 'default',
      name: 'Default School',
      isActivated: false,
      packageType: 'basic',
      maxStudents: 500,
    },
  });
  console.log(`✅ Default school created: ${school.name} (ID: ${school.id})`);

  // 2. Create Admin User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      username: 'admin',
      passwordHash: passwordHash,
      email: 'admin@school.com',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
    },
  });
  console.log(`✅ Admin user created: ${admin.username} (ID: ${admin.id})`);

  console.log('--- Initialization Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
