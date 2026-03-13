#!/usr/bin/env bash
# exit on error
set -o errexit

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

echo ">>> Build complete!"
