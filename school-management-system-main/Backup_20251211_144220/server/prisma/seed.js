const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      email: 'admin@darulquran.edu.ng',
      role: 'admin',
      firstName: 'System',
      lastName: 'Admin'
    }
  });

  console.log('Admin user created:', admin.username);

  // Create Academic Session
  const session = await prisma.academicSession.upsert({
    where: { name: '2024/2025' },
    update: {},
    create: {
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isCurrent: true,
      terms: {
        create: [
          {
            name: 'First Term',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-15'),
            isCurrent: true
          },
          {
            name: 'Second Term',
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-04-10'),
            isCurrent: false
          },
          {
            name: 'Third Term',
            startDate: new Date('2025-04-28'),
            endDate: new Date('2025-07-25'),
            isCurrent: false
          }
        ]
      }
    }
  });

  console.log('Academic session created:', session.name);

  // Create Classes
  const classNames = [
    { name: 'JSS 1', arm: 'A' },
    { name: 'JSS 1', arm: 'B' },
    { name: 'JSS 1', arm: 'C' },
    { name: 'JSS 2', arm: 'A' },
    { name: 'JSS 2', arm: 'B' },
    { name: 'JSS 2', arm: 'C' },
    { name: 'JSS 3', arm: 'A' },
    { name: 'JSS 3', arm: 'B' },
    { name: 'JSS 3', arm: 'C' },
    { name: 'SS 1', arm: 'A' },
    { name: 'SS 1', arm: 'B' },
    { name: 'SS 1', arm: 'C' },
    { name: 'SS 2', arm: 'A' },
    { name: 'SS 2', arm: 'B' },
    { name: 'SS 2', arm: 'C' },
    { name: 'SS 3', arm: 'A' },
    { name: 'SS 3', arm: 'B' },
    { name: 'SS 3', arm: 'C' }
  ];

  for (const classData of classNames) {
    await prisma.class.upsert({
      where: {
        name_arm: {
          name: classData.name,
          arm: classData.arm
        }
      },
      update: {},
      create: {
        name: classData.name,
        arm: classData.arm
      }
    });
  }

  console.log(`Created ${classNames.length} classes`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
