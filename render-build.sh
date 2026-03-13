#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Build started..."

# 1. Install Client Dependencies & Build
echo ">>> Installing client dependencies..."
cd client
npm install
echo ">>> Building client..."
npm run build
cd ..

# 2. Install Server Dependencies
echo ">>> Installing server dependencies..."
cd server
npm install

# 3. Update Prisma Schema for PostgreSQL
echo ">>> Updating Prisma schema for PostgreSQL..."
# Using a more robust sed pattern
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# 4. Generate Prisma Client
echo ">>> Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

echo ">>> Build complete!"
