const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findFirst({
  where: { role: 'superadmin' },
  select: { id: true, username: true, email: true, isActive: true, schoolId: true, role: true }
}).then(u => {
  console.log('Superadmin record:', JSON.stringify(u, null, 2));
  if (u.schoolId !== null) {
    console.log('\nPROBLEM: superadmin has schoolId:', u.schoolId, '— it MUST be null for global login to work.');
  } else {
    console.log('\nOK: schoolId is null, global login should work.');
  }
}).catch(e => {
  console.error(e);
}).finally(() => p.$disconnect());
