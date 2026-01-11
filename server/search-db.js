const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchEverything() {
  const target = 'onrender.com';
  console.log(`Searching entire DB for string: ${target}`);

  try {
    // Get all models from the prisma object
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));

    for (const modelName of models) {
      try {
        const records = await prisma[modelName].findMany();
        for (const record of records) {
          const str = JSON.stringify(record);
          if (str.includes(target)) {
            console.log(`FOUND in model [${modelName}]:`, JSON.stringify(record, null, 2));
          }
        }
      } catch (e) {
        // Some "models" might be methods or internal
      }
    }
    console.log('Search complete.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

searchEverything();
