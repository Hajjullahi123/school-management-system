const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sample = await prisma.classFeeStructure.findFirst();
  console.log('SAMPLE_FS:', JSON.stringify(sample, null, 2));
  process.exit(0);
}

run();
