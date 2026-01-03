const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupAccountant() {
  try {
    console.log('Checking for accountant user...');

    // Check if accountant exists
    const accountant = await prisma.user.findUnique({
      where: { username: 'accountant' }
    });

    if (accountant) {
      console.log('✅ Accountant user already exists');
      console.log('   Username: accountant');
      console.log('   Role:', accountant.role);
      console.log('   Active:', accountant.isActive);

      // Verify password
      const password = 'accountant123';
      const isValid = await bcrypt.compare(password, accountant.passwordHash);

      if (isValid) {
        console.log('✅ Password "accountant123" is correct');
      } else {
        console.log('❌ Password does not match. Resetting to "accountant123"...');
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { username: 'accountant' },
          data: { passwordHash: newHash }
        });
        console.log('✅ Password reset complete');
      }
    } else {
      console.log('Creating accountant user...');

      const password = 'accountant123';
      const passwordHash = await bcrypt.hash(password, 10);

      const newAccountant = await prisma.user.create({
        data: {
          username: 'accountant',
          email: 'accountant@school.com',
          passwordHash,
          role: 'ACCOUNTANT',
          firstName: 'School',
          lastName: 'Accountant',
          isActive: true
        }
      });

      console.log('✅ Accountant user created successfully');
      console.log('   Username: accountant');
      console.log('   Password: accountant123');
      console.log('   Role:', newAccountant.role);
    }

    console.log('\n📝 Accountant Login Credentials:');
    console.log('   Username: accountant');
    console.log('   Password: accountant123');

  } catch (error) {
    console.error('Error setting up accountant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAccountant();
