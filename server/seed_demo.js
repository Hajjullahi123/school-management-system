const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('🌱 Seeding Demo Environment...');
  try {
    // 1. Create Demo School
    const demoSchool = await prisma.school.upsert({
      where: { slug: 'demo' },
      update: {
        isActivated: true,
        subscriptionActive: true,
        packageType: 'premium',
        maxStudents: 1000,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      create: {
        name: 'EduTech Academy (Demo)',
        slug: 'demo',
        isActivated: true,
        subscriptionActive: true,
        packageType: 'premium',
        licenseKey: 'DEMO-PREMIUM-2026',
        maxStudents: 1000,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    const hashedPassword = await bcrypt.hash('Pass1234!', 10);

    // 2. Create Demo Admin User
    const demoAdminUser = await prisma.user.upsert({
      where: { schoolId_username: { schoolId: demoSchool.id, username: 'demo_admin' } },
      update: { role: 'admin', isActive: true },
      create: {
        username: 'demo_admin',
        passwordHash: hashedPassword,
        email: 'demo@edutechai.com',
        firstName: 'Demo',
        lastName: 'Administrator',
        role: 'admin',
        schoolId: demoSchool.id,
        isActive: true
      }
    });

    // 3. Create Demo Class
    const demoClass = await prisma.class.upsert({
      where: { schoolId_name_arm: { schoolId: demoSchool.id, name: 'Demo Class 1', arm: 'Gold' } },
      update: {},
      create: {
        name: 'Demo Class 1',
        arm: 'Gold',
        schoolId: demoSchool.id
      }
    });

    // 4. Create Students (Needs User + Student record)
    for (let i = 1; i <= 5; i++) {
      const studentUsername = `demo_student_${i}`;
      const studentUser = await prisma.user.upsert({
        where: { schoolId_username: { schoolId: demoSchool.id, username: studentUsername } },
        update: {},
        create: {
          username: studentUsername,
          passwordHash: hashedPassword, // Reuse same password
          role: 'student',
          firstName: `Student_${i}`,
          lastName: 'Demo',
          schoolId: demoSchool.id
        }
      });

      await prisma.student.upsert({
        where: { schoolId_admissionNumber: { schoolId: demoSchool.id, admissionNumber: `DEMO-STUD-${i}` } },
        update: {},
        create: {
          admissionNumber: `DEMO-STUD-${i}`,
          schoolId: demoSchool.id,
          userId: studentUser.id,
          classId: demoClass.id,
          dateOfBirth: new Date('2015-05-15'),
          gender: i % 2 === 0 ? 'Female' : 'Male'
        }
      });
    }

    console.log('✅ Demo Environment Seeded Successfully!');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing if called directly
if (require.main === module) {
  seedDemoData()
    .catch(err => console.error('Demo Seeding Failed:', err));
}

module.exports = seedDemoData;

