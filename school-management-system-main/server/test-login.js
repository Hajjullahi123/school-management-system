const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin(schoolSlug, username, password) {
  try {
    console.log(`\n🔐 Testing login...`);
    console.log(`   School: ${schoolSlug}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}\n`);

    // Find school
    const school = await prisma.school.findFirst({
      where: { slug: schoolSlug }
    });

    if (!school) {
      console.log('❌ School not found!');
      return;
    }
    console.log(`✅ School found: ${school.name} (ID: ${school.id})`);
    console.log(`   Activated: ${school.isActivated}\n`);

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        schoolId_username: {
          schoolId: school.id,
          username: username
        }
      }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}\n`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (isValidPassword) {
      console.log('✅ Password is correct!');
      console.log('\n🎉 LOGIN WOULD SUCCEED!\n');
    } else {
      console.log('❌ Password is incorrect!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Test with superadmin credentials
testLogin('default', 'superadmin', 'superadmin123');
