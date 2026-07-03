const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('Starting staff password fix script...');
  
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

  console.log(`Found ${staffUsers.length} staff users to check.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let customPasswordCount = 0;

  for (const user of staffUsers) {
    if (!user.firstName) continue;

    const firstName = user.firstName.trim();
    const lastInitial = user.lastName ? user.lastName.trim().charAt(0).toUpperCase() : '';
    
    const newExpectedPassword = `${firstName}${lastInitial}@123`;
    const oldExpectedPassword = `${firstName}@123`; // Password if lastName was missing or if it was using the old logic

    // Check if it already matches the new expected password
    const matchesNew = await bcrypt.compare(newExpectedPassword, user.passwordHash);
    
    if (matchesNew) {
      skippedCount++;
      continue;
    }

    // Check if it matches the old expected password
    const matchesOld = await bcrypt.compare(oldExpectedPassword, user.passwordHash);

    // Also check if it matches the password based on their username or something else?
    // Let's also check if they used an un-capitalized last initial?
    const lowercaseExpected = `${firstName}${lastInitial.toLowerCase()}@123`;
    const matchesLower = await bcrypt.compare(lowercaseExpected, user.passwordHash);

    if (matchesOld || matchesLower) {
      // They are stuck on an old/incorrect default password, and haven't set a custom one!
      // Update them to the new expected password so the Credential Repository card works.
      const newHash = await bcrypt.hash(newExpectedPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash }
      });
      console.log(`Updated password for ${firstName} ${user.lastName} (Username: ${user.username})`);
      updatedCount++;
    } else {
      // They have a completely different password. They either changed it themselves, or it was manually set.
      // We do NOT touch this!
      customPasswordCount++;
    }
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total Checked: ${staffUsers.length}`);
  console.log(`Updated to match card: ${updatedCount}`);
  console.log(`Already matched card (Skipped): ${skippedCount}`);
  console.log(`Has custom password (Skipped): ${customPasswordCount}`);
  console.log('Finished successfully.');
  
  await prisma.$disconnect();
}

fixPasswords().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
