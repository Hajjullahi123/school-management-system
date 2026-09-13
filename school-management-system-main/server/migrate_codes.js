require('dotenv').config({ path: './server/.env' });
const prisma = require('./db');

async function migrateSchoolCodes() {
  console.log('🚀 Starting School Code Migration...');

  try {
    const schools = await prisma.school.findMany();

    for (const school of schools) {
      let code = school.code;

      // 1. Generate code if it doesn't exist or is invalid
      if (!code || code.includes('UNDEFINED')) {
        // Take first letters of each word, or first 3 letters
        const words = school.name.split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          code = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
        } else if (words.length === 2) {
          code = (words[0][0] + words[1][0] + words[1][1]).toUpperCase();
        } else {
          code = school.name.substring(0, 3).toUpperCase();
        }

        // Clean code (alphanumeric only)
        code = code.replace(/[^A-Z0-9]/g, '');
        if (code.length < 3) code = (code + 'XXX').substring(0, 3);

        // Ensure uniqueness (basic check)
        let uniqueCode = code;
        let counter = 1;
        while (await prisma.school.findFirst({ where: { code: uniqueCode, NOT: { id: school.id } } })) {
          uniqueCode = code.substring(0, 2) + counter;
          counter++;
        }
        code = uniqueCode;

        console.log(`Setting code for [${school.name}]: ${code}`);
        await prisma.school.update({
          where: { id: school.id },
          data: { code }
        });
      }

      // 2. Rename 'admin' users
      const admins = await prisma.user.findMany({
        where: {
          schoolId: school.id,
          role: 'admin',
          username: 'admin'
        }
      });

      for (const admin of admins) {
        const newUsername = `${code}-admin`.toLowerCase();
        console.log(`Renaming admin for [${school.name}]: ${admin.username} -> ${newUsername}`);

        // Handle collision (unlikely but possible)
        const conflict = await prisma.user.findFirst({
          where: { schoolId: school.id, username: newUsername }
        });

        if (!conflict) {
          await prisma.user.update({
            where: { id: admin.id },
            data: { username: newUsername }
          });
        } else {
          console.warn(`⚠️ Username conflict for ${newUsername}, skipping.`);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSchoolCodes();
