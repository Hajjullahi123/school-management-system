const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepSanitize() {
  console.log('--- DEEP SANITIZATION STARTED ---');

  const modelsToClean = [
    { name: 'school', field: 'logoUrl' },
    { name: 'student', field: 'photoUrl' },
    { name: 'teacher', field: 'photoUrl' },
    { name: 'galleryImage', field: 'imageUrl' },
    { name: 'newsEvent', field: 'imageUrl' },
    { name: 'learningResource', field: 'fileUrl' },
    { name: 'alumni', field: 'profilePicture' }
  ];

  try {
    for (const item of modelsToClean) {
      console.log(`Checking ${item.name}.${item.field}...`);

      const records = await prisma[item.name].findMany({
        where: {
          OR: [
            { [item.field]: { contains: 'onrender.com' } },
            { [item.field]: { contains: 'http' } }
          ]
        }
      });

      console.log(`Found ${records.length} matches in ${item.name}.`);

      for (const record of records) {
        const val = record[item.field];
        if (val && (val.includes('onrender.com') || val.startsWith('http'))) {
          if (val.includes('/uploads/')) {
            const relativePath = val.split('/uploads/')[1];
            const newPath = `/uploads/${relativePath}`;

            await prisma[item.name].update({
              where: { id: record.id },
              data: { [item.field]: newPath }
            });
            console.log(`  Updated ${item.name} ID ${record.id}: ${val} -> ${newPath}`);
          } else if (val.startsWith('http')) {
            // Catch-all: check if it still points to onrender.com even without /uploads/
            if (val.includes('onrender.com')) {
              // If it's something weird, just clear it or handle it.
              // Usually it's an image link.
              console.log(`  Skipping non-upload absolute URL: ${val}`);
            }
          }
        }
      }
    }

    console.log('--- SANITIZATION COMPLETE ---');
  } catch (error) {
    console.error('CRITICAL ERROR during sanitization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepSanitize();
