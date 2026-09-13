const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testLogin() {
  const username = 'general';
  const password = 'Gena@2026';
  const schoolSlug = null;

  console.log(`[TEST] Attempting login for username: [${username}], schoolSlug: [${schoolSlug}]`);

  const globalUser = await prisma.user.findFirst({
    where: {
      username: username,
      schoolId: null,
      role: 'superadmin'
    }
  });

  if (!globalUser) {
    console.log('[FAIL] Global user not found in database');
    return;
  }

  console.log('[PASS] Global user found in database');

  const passwordValid = await bcrypt.compare(password, globalUser.passwordHash);
  if (!passwordValid) {
    console.log('[FAIL] Password mismatch');
  } else {
    console.log('[PASS] Password matches');
  }
}

testLogin().then(() => prisma.$disconnect());
