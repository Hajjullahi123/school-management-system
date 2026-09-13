/*
  Warnings:

  - Added the required column `updatedAt` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN "gender" TEXT;
ALTER TABLE "Student" ADD COLUMN "photoUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Result" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "academicSessionId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "assignment1Score" REAL,
    "assignment2Score" REAL,
    "test1Score" REAL,
    "test2Score" REAL,
    "examScore" REAL,
    "totalScore" REAL NOT NULL,
    "grade" TEXT,
    "positionInClass" INTEGER,
    "classAverage" REAL,
    "ca1Score" REAL,
    "ca2Score" REAL,
    "marks" REAL,
    "examId" INTEGER,
    "teacherId" INTEGER,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Result_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Result" ("academicSessionId", "ca1Score", "ca2Score", "classId", "createdAt", "examId", "examScore", "grade", "id", "isSubmitted", "marks", "positionInClass", "studentId", "subjectId", "submittedAt", "teacherId", "termId", "totalScore") SELECT "academicSessionId", "ca1Score", "ca2Score", "classId", "createdAt", "examId", "examScore", "grade", "id", "isSubmitted", "marks", "positionInClass", "studentId", "subjectId", "submittedAt", "teacherId", "termId", "totalScore" FROM "Result";
DROP TABLE "Result";
ALTER TABLE "new_Result" RENAME TO "Result";
CREATE UNIQUE INDEX "Result_studentId_subjectId_termId_academicSessionId_key" ON "Result"("studentId", "subjectId", "termId", "academicSessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
