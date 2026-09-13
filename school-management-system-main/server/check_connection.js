const prisma = require('./db');

async function main() {
  try {
    const count = await prisma.user.count();
    console.log('Database connected successfully. User count:', count);
  } catch (e) {
    console.error('Database connection failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
