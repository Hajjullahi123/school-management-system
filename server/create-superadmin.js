const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createOrUpdateSuperadmin() {
  try {
    console.log('🔧 Setting up superadmin account...\n');

    // Find or create the default school
    let school = await prisma.school.findFirst({
      where: { slug: 'default' }
    });

    if (!school) {
      console.log('📚 Creating default school...');
      school = await prisma.school.create({
        data: {
          slug: 'default',
          name: 'Default School',
          isActivated: true,
          isSetupComplete: true
        }
      });
      console.log(`✅ School created: ${school.name} (slug: ${school.slug})\n`);
    } else {
      console.log(`✅ School found: ${school.name} (slug: ${school.slug})\n`);

      // Make sure it's activated
      if (!school.isActivated) {
        await prisma.school.update({
          where: { id: school.id },
          data: { isActivated: true }
        });
        console.log('✅ School activated\n');
      }
    }

    // Check if superadmin exists
    let superadmin = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        role: 'superadmin'
      }
    });

    const newPassword = 'superadmin123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    if (!superadmin) {
      console.log('👤 Creating superadmin user...');
      superadmin = await prisma.user.create({
        data: {
          schoolId: school.id,
          username: 'superadmin',
          passwordHash: passwordHash,
          email: 'superadmin@system.local',
          role: 'superadmin',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          mustChangePassword: false
        }
      });
      console.log('✅ Superadmin created!\n');
    } else {
      console.log('👤 Superadmin exists, updating password...');
      await prisma.user.update({
        where: { id: superadmin.id },
        data: {
          passwordHash: passwordHash,
          isActive: true,
          mustChangePassword: false
        }
      });
      console.log('✅ Superadmin password updated!\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('📋 SUPERADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log(`School Domain: ${school.slug}`);
    console.log(`Username:      ${superadmin.username}`);
    console.log(`Password:      ${newPassword}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createOrUpdateSuperadmin();
