const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTables() {
  console.log('🔧 Creating Gallery and NewsEvent tables...\n');

  try {
    // Create GalleryImage table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GalleryImage" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "imageUrl" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "uploadedBy" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('✅ Created GalleryImage table');

    // Create NewsEvent table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NewsEvent" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "eventDate" DATETIME,
        "imageUrl" TEXT,
        "isPublished" BOOLEAN NOT NULL DEFAULT 0,
        "authorId" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    console.log('✅ Created NewsEvent table');

    await prisma.$disconnect();
    console.log('\n✅ Done! Tables created successfully!');
    console.log('Next: npx prisma db pull && npx prisma generate');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

createTables();
