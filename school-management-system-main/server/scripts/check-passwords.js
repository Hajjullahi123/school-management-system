const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPasswords() {
  console.log('--- STAFF PASSWORD STATUS CHECK ---');
  
  const staffRoles = [
    'teacher', 'admin', 'sub_admin', 'principal', 
    'accountant', 'examination_officer', 'attendance_admin'
  ];

  const staffUsers = await prisma.user.findMany({
    where: {
      role: {
        in: staffRoles
      }
    }
  });

  let matchingCount = 0;
  let customCount = 0;
  let oldFormatCount = 0;

  console.log('\n[DETAILS]');
  for (const user of staffUsers) {
    if (!user.firstName) continue;

    const firstName = user.firstName.trim();
    const lastInitial = user.lastName ? user.lastName.trim().charAt(0).toUpperCase() : '';
    
    const currentExpectedPassword = `${firstName}${lastInitial}@123`;
    const oldExpectedPassword = `${firstName}@123`;

    const matchesCurrent = await bcrypt.compare(currentExpectedPassword, user.passwordHash);
    
    if (matchesCurrent) {
      console.log(`✅ [MATCHES CARD] ${firstName} ${user.lastName || ''} (Username: ${user.username})`);
      matchingCount++;
      continue;
    }

    const matchesOld = await bcrypt.compare(oldExpectedPassword, user.passwordHash);
    if (matchesOld) {
      console.log(`⚠️ [OLD FORMAT] ${firstName} ${user.lastName || ''} (Username: ${user.username}) - Needs fix!`);
      oldFormatCount++;
      continue;
    }

    // If it doesn't match either, it's custom
    console.log(`🔒 [CUSTOM/CHANGED] ${firstName} ${user.lastName || ''} (Username: ${user.username})`);
    customCount++;
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total Staff Checked: ${staffUsers.length}`);
  console.log(`Matching Card Exactly: ${matchingCount}`);
  console.log(`Stuck on Old Format: ${oldFormatCount}`);
  console.log(`Custom/Changed Passwords: ${customCount}`);
  console.log('-----------------------------------');
  
  await prisma.$disconnect();
}

checkPasswords().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
