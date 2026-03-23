const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: "file:./dev.db" // Assuming SQLite from previous context
});

async function main() {
  const settings = await prisma.globalSettings.findFirst();
  console.log(JSON.stringify(settings, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
