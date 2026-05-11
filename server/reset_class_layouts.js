const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting all class report layouts to NULL to enable school-wide branding inheritance...');
  
  const result = await prisma.class.updateMany({
    data: {
      reportLayout: null
    }
  });
  
  console.log(`Successfully updated ${result.count} classes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
