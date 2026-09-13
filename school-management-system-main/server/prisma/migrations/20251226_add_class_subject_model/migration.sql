-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- Step 1: Create ClassSubject records from existing TeacherAssignments
INSERT INTO ClassSubject (classId, subjectId, createdAt)
SELECT DISTINCT classId, subjectId, MIN(createdAt) as createdAt
FROM TeacherAssignment
GROUP BY classId, subjectId;

-- Step 2: Create a temporary table to store the new TeacherAssignment structure
CREATE TABLE "TeacherAssignment_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacherId" INTEGER NOT NULL,
    "classSubjectId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 3: Migrate existing TeacherAssignment data to new structure
INSERT INTO TeacherAssignment_new (id, teacherId, classSubjectId, createdAt)
SELECT 
    ta.id,
    ta.teacherId,
    cs.id as classSubjectId,
    ta.createdAt
FROM TeacherAssignment ta
INNER JOIN ClassSubject cs ON ta.classId = cs.classId AND ta.subjectId = cs.subjectId;

-- Step 4: Drop old table and rename new table
DROP TABLE "TeacherAssignment";
ALTER TABLE "TeacherAssignment_new" RENAME TO "TeacherAssignment";

-- Step 5: Create unique index on new TeacherAssignment
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_classSubjectId_key" ON "TeacherAssignment"("teacherId", "classSubjectId");
