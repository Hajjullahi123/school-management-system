const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('Starting data migration...');

  try {
    // Step 1: Create ClassSubject records from existing TeacherAssignments
    console.log('Step 1: Extracting unique class-subject combinations...');
    const existingAssignments = await prisma.teacherAssignment.findMany({
      select: {
        classId: true,
        subjectId: true,
        createdAt: true,
      },
    });

    // Group by classId and subjectId
    const classSubjectMap = new Map();
    existingAssignments.forEach((assignment) => {
      const key = `${assignment.classId}-${assignment.subjectId}`;
      if (!classSubjectMap.has(key) || assignment.createdAt < classSubjectMap.get(key).createdAt) {
        classSubjectMap.set(key, {
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          createdAt: assignment.createdAt,
        });
      }
    });

    console.log(`Found ${classSubjectMap.size} unique class-subject combinations`);

    // Step 2: Use raw SQL to create new tables and migrate data
    console.log('Step 2: Executing SQL migration...');

    // Create ClassSubject table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClassSubject" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "classId" INTEGER NOT NULL,
        "subjectId" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");
    `);

    console.log('ClassSubject table created');

    // Step 3: Insert ClassSubject records
    for (const [key, data] of classSubjectMap) {
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO ClassSubject (classId, subjectId, createdAt)
        VALUES (${data.classId}, ${data.subjectId}, '${data.createdAt.toISOString()}');
      `);
    }

    console.log(`Inserted ${classSubjectMap.size} ClassSubject records`);

    // Step 4: Create new TeacherAssignment table
    console.log('Step 4: Creating new TeacherAssignment table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "TeacherAssignment_new" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "teacherId" INTEGER NOT NULL,
        "classSubjectId" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TeacherAssignment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Step 5: Migrate data
    console.log('Step 5: Migrating TeacherAssignment data...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO TeacherAssignment_new (id, teacherId, classSubjectId, createdAt)
      SELECT 
        ta.id,
        ta.teacherId,
        cs.id as classSubjectId,
        ta.createdAt
      FROM TeacherAssignment ta
      INNER JOIN ClassSubject cs ON ta.classId = cs.classId AND ta.subjectId = cs.subjectId;
    `);

    // Step 6: Drop old table and rename
    console.log('Step 6: Replacing old TeacherAssignment table...');
    await prisma.$executeRawUnsafe(`DROP TABLE "TeacherAssignment";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TeacherAssignment_new" RENAME TO "TeacherAssignment";`);

    // Step 7: Create unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "TeacherAssignment_teacherId_classSubjectId_key" ON "TeacherAssignment"("teacherId", "classSubjectId");
    `);

    console.log('Migration completed successfully!');
    console.log('Summary:');
    console.log(`  - Created ${classSubjectMap.size} ClassSubject records`);
    console.log(`  - Migrated ${existingAssignments.length} TeacherAssignment records`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
