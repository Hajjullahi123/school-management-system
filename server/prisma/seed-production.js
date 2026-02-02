const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedProduction() {
  try {
    console.log('🌱 Seeding production database...\n');

    // 1. Create Default School
    const school = await prisma.school.upsert({
      where: { slug: 'default' },
      update: {
        isActivated: true,
        isSetupComplete: true
      },
      create: {
        slug: 'default',
        name: 'School Management System',
        address: 'Nigeria',
        phone: '08000000000',
        email: 'admin@school.edu.ng',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#60a5fa',
        isActivated: true,
        isSetupComplete: true
      }
    });

    console.log(`✅ School: ${school.name} (slug: ${school.slug})`);

    // 2. Create Superadmin User
    const superadminPassword = await bcrypt.hash('superadmin123', 12);

    const superadmin = await prisma.user.upsert({
      where: {
        schoolId_username: {
          schoolId: school.id,
          username: 'superadmin'
        }
      },
      update: {
        passwordHash: superadminPassword,
        isActive: true,
        role: 'superadmin'
      },
      create: {
        schoolId: school.id,
        username: 'superadmin',
        passwordHash: superadminPassword,
        email: 'superadmin@system.local',
        role: 'superadmin',
        firstName: 'Global',
        lastName: 'Superadmin',
        isActive: true,
        mustChangePassword: false
      }
    });

    console.log(`✅ Superadmin: ${superadmin.username}`);

    // 3. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
      where: {
        schoolId_username: {
          schoolId: school.id,
          username: 'admin'
        }
      },
      update: {
        passwordHash: adminPassword,
        isActive: true,
        role: 'admin'
      },
      create: {
        schoolId: school.id,
        username: 'admin',
        passwordHash: adminPassword,
        email: 'admin@school.edu.ng',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        isActive: true,
        mustChangePassword: false
      }
    });

    console.log(`✅ Admin: ${admin.username}`);

    // 4. Create Academic Session
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
        isCurrent: true
      }
    });

    console.log(`✅ Session: ${session.name}`);

    // 5. Create Terms
    const terms = [
      { name: 'First Term', startDate: new Date('2024-09-01'), endDate: new Date('2024-12-15'), isCurrent: true },
      { name: 'Second Term', startDate: new Date('2025-01-06'), endDate: new Date('2025-04-10'), isCurrent: false },
      { name: 'Third Term', startDate: new Date('2025-04-28'), endDate: new Date('2025-07-25'), isCurrent: false }
    ];

    for (const termData of terms) {
      await prisma.term.upsert({
        where: {
          schoolId_academicSessionId_name: {
            schoolId: school.id,
            academicSessionId: session.id,
            name: termData.name
          }
        },
        update: termData,
        create: {
          ...termData,
          schoolId: school.id,
          academicSessionId: session.id
        }
      });
      console.log(`✅ Term: ${termData.name}`);
    }

    // 6. Create Demo Academy (Added for persistent demo access)
    console.log('\n🌟 Seeding Demo Academy...');
    const demoPassword = await bcrypt.hash('password123', 12);

    const demoSchool = await prisma.school.upsert({
      where: { slug: 'demo-academy' },
      update: { isActivated: true, isSetupComplete: true },
      create: {
        slug: 'demo-academy',
        name: 'Demo Excellence Academy',
        address: '123 Demo Street, Innovation Hub',
        phone: '0800-DEMO-ACADEMY',
        email: 'info@demoacademy.com',
        primaryColor: '#0f172a',
        secondaryColor: '#3b82f6',
        isActivated: true,
        packageType: 'premium',
        maxStudents: 1000,
        isSetupComplete: true
      }
    });
    console.log(`✅ Demo School: ${demoSchool.name}`);

    // Create Demo Admin
    const demoAdmin = await prisma.user.upsert({
      where: {
        schoolId_username: {
          schoolId: demoSchool.id,
          username: 'demo.admin'
        }
      },
      update: { passwordHash: demoPassword, isActive: true },
      create: {
        schoolId: demoSchool.id,
        username: 'demo.admin',
        passwordHash: demoPassword,
        email: 'admin@demo.com',
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        isActive: true,
        mustChangePassword: false
      }
    });
    console.log(`✅ Demo Admin: ${demoAdmin.username}`);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Production database seeded successfully!');
    console.log('═══════════════════════════════════════');
    console.log('📋 LATEST CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log(`School Domain: ${school.slug}`);
    console.log(`Superadmin:    superadmin / superadmin123`);
    console.log(`Admin:         admin / admin123`);
    console.log('---------------------------------------');
    console.log(`DEMO SCHOOL PATH: /s/demo-academy`);
    console.log(`Demo Admin:    demo.admin / password123`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProduction()
  .catch((e) => {
    console.error('❌ Seeding Failed (but continuing):', e);
  });
