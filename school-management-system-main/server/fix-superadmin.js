const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function fixSuperadmin() {
  try {
    console.log('🔧 Fixing superadmin school association...\n');

    // Use raw SQL to bypass Prisma's relationship constraints
    await prisma.$executeRaw`UPDATE User SET schoolId = NULL WHERE username = 'superadmin' AND role = 'superadmin'`;

    console.log('✅ Successfully updated superadmin to have global access!\n');

    // Verify the change
    const superadmin = await prisma.user.findFirst({
      where: { username: 'superadmin', role: 'superadmin' },
      include: { school: true }
    });

    console.log('═══════════════════════════════════════');
    console.log('VERIFICATION:');
    console.log('═══════════════════════════════════════');
    console.log('Username:', superadmin.username);
    console.log('School ID:', superadmin.schoolId);
    console.log('School:', superadmin.school ? superadmin.school.name : 'NULL (Global Access ✓)');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperadmin();
