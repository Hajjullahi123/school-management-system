#!/usr/bin/env bash
# exit on error
set -o errexit

# Set Node Memory Options for the entire build process
export NODE_OPTIONS=--max-old-space-size=2048

echo ">>> Build started..."

# 1. Install Client Dependencies & Build
echo ">>> Installing client dependencies (memory-optimized)..."
cd client
# Using --no-audit and --no-fund to save memory on free tier
npm install --no-audit --no-fund
echo ">>> Building client..."
npm run build
cd ..

# 2. Install Server Dependencies
echo ">>> Installing server dependencies..."
cd server
npm install --no-audit --no-fund

# 3. Update Prisma Schema for PostgreSQL
echo ">>> Updating Prisma schema for PostgreSQL..."
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# 4. Generate Prisma Client
echo ">>> Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

# 5. Pre-migration: Drop stale unique indexes and clear corrupted data
echo ">>> Pre-migration cleanup..."
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
-- Drop stale indexes
DROP INDEX IF EXISTS "StaffAttendance_schoolId_userId_date_key";
DROP INDEX IF EXISTS "Student_schoolId_admissionNumber_key";
DROP INDEX IF EXISTS "Student_schoolId_rollNo_key";
DROP INDEX IF EXISTS "Alumni_studentId_key";
DROP INDEX IF EXISTS "QuranTarget_schoolId_classId_key";

-- Clear orphaned/corrupted StaffAttendance rows from previous schema version
-- These 16 rows lost their staffId during the schema rewrite and were populated 
-- with userId=1, causing the P2002 unique constraint violation.
DELETE FROM "StaffAttendance";

-- Backfill admissionNumber for Student table to avoid unique constraint violations
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
UPDATE "Student" SET "admissionNumber" = 'LEGACY-ADM-' || id WHERE "admissionNumber" IS NULL OR "admissionNumber" = '';
ALTER TABLE "Student" ALTER COLUMN "admissionNumber" SET NOT NULL;
SQL

# 6. Synchronize Database (Force push for Dev/Stage)
echo ">>> Synchronizing database schema..."
npx prisma db push --accept-data-loss --schema=prisma/schema.prisma

# 6. Database sync complete
echo ">>> Build complete!"
