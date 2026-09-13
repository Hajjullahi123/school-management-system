const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('--- EMERGENCY SYSTEM RECOVERY INITIALIZED ---');
  
  try {
    // 1. Create School
    const school = await prisma.school.upsert({
      where: { slug: 'darul-quran' },
      update: {},
      create: {
        name: "Darul Qur'an Academy",
        slug: 'darul-quran',
        address: 'Kano, Nigeria',
        phone: '08000000000',
        email: 'info@darulquran.com',
        isActivated: true,
        subscriptionActive: true
      }
    });
    console.log('✔ School Context Restored:', school.name, `(ID: ${school.id})`);

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { 
        schoolId_username: { 
          schoolId: school.id, 
          username: 'admin' 
        } 
      },
      update: { passwordHash },
      create: {
        username: 'admin',
        passwordHash,
        email: 'admin@darulquran.com',
        role: 'admin',
        firstName: 'School',
        lastName: 'Administrator',
        schoolId: school.id
      }
    });
    console.log('✔ Admin Account Initialized: admin / admin123');

    // 3. Create Academic Session
    const session = await prisma.academicSession.upsert({
      where: { schoolId_name: { schoolId: school.id, name: '2025/2026' } },
      update: { isCurrent: true },
      create: {
        name: '2025/2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-07-31'),
        isCurrent: true,
        schoolId: school.id
      }
    });
    console.log('✔ Academic Session Active:', session.name);

    // 4. Create Term
    const term = await prisma.term.upsert({
      where: { schoolId_academicSessionId_name: { schoolId: school.id, academicSessionId: session.id, name: 'Third Term' } },
      update: { isCurrent: true },
      create: {
        name: 'Third Term',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-07-31'),
        isCurrent: true,
        schoolId: school.id,
        academicSessionId: session.id
      }
    });
    console.log('✔ Academic Term Active:', term.name);

    // 5. Create Default Classes
    const classNames = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    for (const name of classNames) {
      await prisma.class.upsert({
        where: { schoolId_name_arm: { schoolId: school.id, name, arm: 'A' } },
        update: {},
        create: {
          name,
          arm: 'A',
          schoolId: school.id,
          isActive: true
        }
      });
    }
    console.log('✔ Primary Registry Initialized: 6 Class Levels Created.');

    console.log('\n--- RECOVERY COMPLETE ---');
    console.log('You can now log in and use the "Quick Fee Setup" tool.');

  } catch (error) {
    console.error('FATAL RECOVERY ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
