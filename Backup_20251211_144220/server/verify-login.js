const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verifyLogin() {
  try {
    console.log('Verifying admin login...');

    const username = 'admin';
    const password = 'admin123';

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      console.log('❌ User "admin" NOT FOUND in database');
      return;
    }

    console.log('✅ User "admin" found in database');
    console.log('   ID:', user.id);
    console.log('   Role:', user.role);
    console.log('   Active:', user.isActive);
    console.log('   Stored Hash:', user.passwordHash.substring(0, 20) + '...');

    // 2. Compare password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (isValid) {
      console.log('✅ Password "admin123" MATCHES the stored hash');
      console.log('   Login should work correctly.');
    } else {
      console.log('❌ Password "admin123" DOES NOT MATCH the stored hash');
      console.log('   The password in the database is different.');

      // Reset password
      console.log('   Resetting password to "admin123"...');
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { username },
        data: { passwordHash: newHash }
      });
      console.log('✅ Password reset complete. Try logging in again.');
    }

  } catch (error) {
    console.error('Error verifying login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLogin();
