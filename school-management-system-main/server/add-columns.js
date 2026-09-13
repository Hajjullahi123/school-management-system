const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE SchoolSettings ADD COLUMN facebookUrl TEXT');
    console.log('✅ Added facebookUrl column');
  } catch (e) {
    console.log('⚠️ facebookUrl column already exists or error:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE SchoolSettings ADD COLUMN instagramUrl TEXT');
    console.log('✅ Added instagramUrl column');
  } catch (e) {
    console.log('⚠️ instagramUrl column already exists or error:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE SchoolSettings ADD COLUMN whatsappUrl TEXT');
    console.log('✅ Added whatsappUrl column');
  } catch (e) {
    console.log('⚠️ whatsappUrl column already exists or error:', e.message);
  }

  await prisma.$disconnect();
  console.log('\n✅ Done! Run: npx prisma db pull && npx prisma generate');
}

addColumns();