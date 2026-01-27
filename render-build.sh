#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Build started..."

# 1. Install Client Dependencies & Build
echo "Installing client dependencies..."
cd client
# Do not remove node_modules as it speeds up subsequent builds
npm install
echo "Building client..."
npm run build
cd ..

# 2. Install Server Dependencies
echo "Installing server dependencies..."
cd server
npm install

# 3. Update Prisma Schema for PostgreSQL (Render uses Postgres)
echo "Updating Prisma schema for PostgreSQL..."
if [ "$(uname)" = "Darwin" ]; then
    # Mac OS requires empty string argument for -i
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
else
    # Linux (Render) standard sed
    sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
fi

# 4. Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

echo "Build complete!"
