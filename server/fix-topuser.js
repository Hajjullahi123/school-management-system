const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function fixTopUser() {
  const username = 'topuser';
  const password = 'topuser@2026';

  try {
    console.log(`🔧 Ensuring user "${username}" has superadmin access...`);

    const passwordHash = await bcrypt.hash(password, 12);

    // Try to find the user globally (schoolId: null)
    let user = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        schoolId: null
      }
    });

    if (user) {
      console.log(`✅ User "${username}" found. Updating password and role...`);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: 'superadmin',
          isActive: true
        }
      });
      console.log(`✨ User "${username}" updated successfully.`);
    } else {
      console.log(`👤 User "${username}" not found. Creating as new superadmin...`);
      
      // We need a default school if one doesn't exist, but superadmins are global.
      // However, the Prisma schema might have constraints.
      
      await prisma.user.create({
        data: {
          username: username,
          passwordHash: passwordHash,
          role: 'superadmin',
          schoolId: null,
          firstName: 'Top',
          lastName: 'User',
          isActive: true,
          mustChangePassword: false
        }
      });
      console.log(`✨ User "${username}" created successfully.`);
    }

    console.log('\n--- SUCCESS ---');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('Role:     superadmin (Global Access)');
    console.log('----------------\n');

  } catch (error) {
    console.error('❌ Error fixing topuser:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTopUser();
