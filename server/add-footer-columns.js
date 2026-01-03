const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFooterLinkColumns() {
  console.log('🔧 Adding footer link columns to SchoolSettings...\n');

  const columns = [
    'academicCalendarUrl',
    'eLibraryUrl',
    'alumniNetworkUrl',
    'brochureFileUrl',
    'admissionGuideFileUrl'
  ];

  for (const column of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE SchoolSettings ADD COLUMN ${column} TEXT`);
      console.log(`✅ Added ${column} column`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`⚠️  ${column} column already exists`);
      } else {
        console.log(`❌ Error adding ${column}:`, e.message);
      }
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Done! Next steps:');
  console.log('1. Run: npx prisma db pull');
  console.log('2. Run: npx prisma generate');
  console.log('3. Restart your server');
}

addFooterLinkColumns();
