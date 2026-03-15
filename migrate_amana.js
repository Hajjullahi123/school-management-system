const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const dbPath = path.resolve(__dirname, 'server', 'prisma', 'dev.db');

async function migrate() {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

  const getRows = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
  });

  try {
    console.log('🚀 Starting migration from SQLite to Supabase...');

    // 1. Get Amana Academy School
    const schoolRows = await getRows("SELECT * FROM School WHERE slug = 'amana-academy'");
    if (schoolRows.length === 0) {
      console.error('❌ Amana Academy not found in dev.db');
      return;
    }

    const s = schoolRows[0];
    const school = await prisma.school.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        address: s.address,
        phone: s.phone,
        email: s.email,
        primaryColor: s.primaryColor || '#1e40af',
        secondaryColor: s.secondaryColor || '#3b82f6',
        isActivated: s.isActivated === 1,
        isSetupComplete: s.isSetupComplete === 1,
        // Add other critical fields if necessary
      }
    });

    console.log(`✅ School migrated: ${school.name} (ID: ${school.id})`);

    // 2. Get Users for this school
    // Note: In SQLite, boolean might be 0/1. In Prisma/Postgres it's boolean.
    const userRows = await getRows("SELECT * FROM User WHERE schoolId = ?", [s.id]);
    console.log(`⏳ Migrating ${userRows.length} users...`);

    let count = 0;
    for (const u of userRows) {
      await prisma.user.upsert({
        where: {
          schoolId_username: {
            schoolId: school.id,
            username: u.username
          }
        },
        update: {},
        create: {
          schoolId: school.id,
          username: u.username,
          passwordHash: u.passwordHash,
          email: u.email,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: u.isActive === 1,
          mustChangePassword: u.mustChangePassword === 1,
        }
      });
      count++;
      if (count % 20 === 0) console.log(`  ...migrated ${count} users`);
    }

    console.log(`✅ Successfully migrated ${count} users.`);
    console.log('🎉 Migration complete! Try logging in now.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

migrate();
