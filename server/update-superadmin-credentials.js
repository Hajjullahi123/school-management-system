const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// ========================================
// CONFIGURE YOUR NEW CREDENTIALS HERE
// ========================================
const NEW_USERNAME = 'general';  // Change this to your desired username
const NEW_PASSWORD = 'Gena@2026';  // Change this to your desired password
// ========================================

async function updateSuperadminCredentials() {
  try {
    console.log('🔧 Updating superadmin credentials...\n');

    // Find the superadmin
    const superadmin = await prisma.user.findFirst({
      where: {
        schoolId: null,
        role: 'superadmin'
      }
    });

    if (!superadmin) {
      console.log('❌ No superadmin found with global access!');
      console.log('Please run fix-superadmin.js first.\n');
      return;
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(NEW_PASSWORD, 12);

    // Update credentials
    await prisma.user.update({
      where: { id: superadmin.id },
      data: {
        username: NEW_USERNAME,
        passwordHash: newPasswordHash
      }
    });

    console.log('✅ Superadmin credentials updated successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 NEW CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log('Username:', NEW_USERNAME);
    console.log('Password:', NEW_PASSWORD);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuperadminCredentials();
