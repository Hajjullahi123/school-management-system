-- AlterTable
ALTER TABLE "Student" ADD COLUMN "address" TEXT;
ALTER TABLE "Student" ADD COLUMN "bloodGroup" TEXT;
ALTER TABLE "Student" ADD COLUMN "disability" TEXT;
ALTER TABLE "Student" ADD COLUMN "genotype" TEXT;
ALTER TABLE "Student" ADD COLUMN "nationality" TEXT DEFAULT 'Nigerian';
ALTER TABLE "Student" ADD COLUMN "parentGuardianName" TEXT;
ALTER TABLE "Student" ADD COLUMN "parentGuardianPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN "stateOfOrigin" TEXT;
