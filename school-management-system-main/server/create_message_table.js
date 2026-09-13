const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to create ParentTeacherMessage table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ParentTeacherMessage" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "schoolId" INTEGER NOT NULL,
        "senderId" INTEGER NOT NULL,
        "receiverId" INTEGER NOT NULL,
        "senderRole" TEXT NOT NULL,
        "studentId" INTEGER NOT NULL,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "messageType" TEXT NOT NULL DEFAULT 'general',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "readAt" DATETIME,
        "parentMessageId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ParentTeacherMessage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('Table created or already exists.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
