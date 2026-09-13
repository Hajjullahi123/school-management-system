const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.school.findFirst();
  const licenseCount = await prisma.license.count();
  const licenses = await prisma.license.findMany();

  console.log('School Settings:', settings);
  console.log('Total Licenses in DB:', licenseCount);
  console.log('Licenses:', licenses);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
