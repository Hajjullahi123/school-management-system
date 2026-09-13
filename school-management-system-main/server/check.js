const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.count();
  const drafts = await prisma.admissionApplication.findMany({ where: { status: 'draft' } });
  const allApps = await prisma.admissionApplication.count();
  console.log('Classes:', classes);
  console.log('Drafts:', drafts.length);
  console.log('All Apps:', allApps);
}
main().catch(console.error).finally(() => prisma.$disconnect());
