const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true, slug: true, customDomain: true } });
  console.log('Schools:', schools);
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, username: true, schoolId: true } });
  console.log('Admins:', admins);
}
main().catch(console.error).finally(() => prisma.$disconnect());
