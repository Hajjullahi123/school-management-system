const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const accountant = await prisma.user.upsert({
    where: { username: 'accountant' },
    update: {
      passwordHash: hashedPassword,
      role: 'accountant',
      isActive: true
    },
    create: {
      username: 'accountant',
      passwordHash: hashedPassword,
      email: 'accountant@school.edu',
      firstName: 'School',
      lastName: 'Accountant',
      role: 'accountant',
      isActive: true
    }
  });

  console.log('Accountant user created/updated:');
  console.log('Username: accountant');
  console.log('Password: 123456');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
