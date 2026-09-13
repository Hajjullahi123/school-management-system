-- Simple migration to fix the database
-- This will:
-- 1. Create ClassSubject table
-- 2. Migrate existing TeacherAssignment data
-- 3. Update TeacherAssignment structure

-- Step 1: Create ClassSubject table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ClassSubject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE
);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- Step 2: Check if TeacherAssignment has old structure
-- If it has classId column, we need to migrate

-- First, check if we need to migrate by looking at table structure
-- If TeacherAssignment already has classSubjectId, skip migration
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='TeacherAssignment';

-- Step 3: Create ClassSubject records from existing TeacherAssignments
INSERT OR IGNORE INTO "ClassSubject" ("classId", "subjectId", "createdAt")
SELECT DISTINCT "classId", "subjectId", MIN("createdAt")
FROM "TeacherAssignment"
GROUP BY "classId", "subjectId";

-- Step 4: Create new TeacherAssignment table with correct structure
DROP TABLE IF EXISTS "TeacherAssignment_new";
CREATE TABLE "TeacherAssignment_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacherId" INTEGER NOT NULL,
    "classSubjectId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject" ("id") ON DELETE CASCADE
);

-- Step 5: Migrate data to new table
INSERT INTO "TeacherAssignment_new" ("id", "teacherId", "classSubjectId", "createdAt")
SELECT 
    ta."id",
    ta."teacherId",
    cs."id" as "classSubjectId",
    ta."createdAt"
FROM "TeacherAssignment" ta
INNER JOIN "ClassSubject" cs ON ta."classId" = cs."classId" AND ta."subjectId" = cs."subjectId";

-- Step 6: Replace old table with new one
DROP TABLE "TeacherAssignment";
ALTER TABLE "TeacherAssignment_new" RENAME TO "TeacherAssignment";

-- Step 7: Create unique index
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_classSubjectId_key" ON "TeacherAssignment"("teacherId", "classSubjectId");
