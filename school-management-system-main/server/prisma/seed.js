const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default School
  const school = await prisma.school.upsert({
    where: { slug: 'default-school' },
    update: {},
    create: {
      slug: 'default-school',
      name: 'Darul Quran College', // Example name
      address: '123 School Street',
      phone: '08000000000',
      email: 'info@school.edu.ng',
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#60a5fa',
      isSetupComplete: true
    }
  });

  console.log('School created/found:', school.name, '(ID:', school.id, ')');

  // 2. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: {
      schoolId_username: {
        schoolId: school.id,
        username: 'admin'
      }
    },
    update: {
      role: 'admin', // Ensure role is admin
      passwordHash: adminPassword
    },
    create: {
      schoolId: school.id,
      username: 'admin',
      passwordHash: adminPassword,
      email: 'admin@school.edu.ng',
      role: 'admin',
      firstName: 'System',
      lastName: 'Admin'
    }
  });

  console.log('Admin user created:', admin.username);

  // 3. Create Academic Session
  const session = await prisma.academicSession.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: '2024/2025'
      }
    },
    update: {},
    create: {
      schoolId: school.id,
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isCurrent: true,
      terms: {
        create: [
          {
            schoolId: school.id,
            name: 'First Term',
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-12-15'),
            isCurrent: true
          },
          {
            schoolId: school.id,
            name: 'Second Term',
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-04-10'),
            isCurrent: false
          },
          {
            schoolId: school.id,
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

  // 4. Create Classes
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
        schoolId_name_arm: {
          schoolId: school.id,
          name: classData.name,
          arm: classData.arm
        }
      },
      update: {},
      create: {
        schoolId: school.id,
        name: classData.name,
        arm: classData.arm
      }
    });
  }

  console.log(`Created/Verified ${classNames.length} classes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
