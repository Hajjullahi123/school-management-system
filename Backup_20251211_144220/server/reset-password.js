const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const username = '2025-JSS1A-KM'; // The username we found
  const newPassword = '123456';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { username },
    data: {
      passwordHash: hashedPassword,
      mustChangePassword: false // Disable forced change for testing
    }
  });

  console.log(`Password reset for user: ${updatedUser.username}`);
  console.log(`New Password: ${newPassword}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
