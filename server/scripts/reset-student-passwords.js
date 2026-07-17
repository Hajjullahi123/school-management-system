const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetStudentPasswords() {
  console.log('Starting student password reset script...');

  // 1. Find all users with the role of 'student'
  const studentUsers = await prisma.user.findMany({
    where: {
      role: 'student'
    }
  });

  console.log(`Found ${studentUsers.length} student users to reset.`);

  // 2. Hash the default password '123456'
  const defaultPassword = '123456';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let updatedCount = 0;

  // 3. Update each student's password
  for (const user of studentUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash: hashedPassword,
          mustChangePassword: false // Optional: reset this so they aren't forced unless you want to
        }
      });
      console.log(`Reset password for student: ${user.username} (${user.firstName} ${user.lastName})`);
      updatedCount++;
    } catch (err) {
      console.error(`Failed to reset password for student ${user.username}:`, err);
    }
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total Students Found: ${studentUsers.length}`);
  console.log(`Successfully Reset: ${updatedCount}`);
  console.log('Finished successfully.');

  await prisma.$disconnect();
}

resetStudentPasswords().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
