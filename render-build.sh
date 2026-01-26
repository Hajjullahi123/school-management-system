#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Build started..."

# 1. Install Client Dependencies & Build
echo "Installing client dependencies..."
cd client
rm -rf node_modules
npm install --include=dev
echo "Building client..."
npm run build
cd ..

# 2. Install Server Dependencies
echo "Installing server dependencies..."
cd server
rm -rf node_modules
npm install

# 3. Update Prisma Schema for PostgreSQL (Render uses Postgres)
# We replace 'sqlite' with 'postgresql' in the provider
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

# 5. Run Database Migrations (Optional - usually done in build or start)
# Note: We rely on Render's DATABASE_URL env var
# echo "Pushing database schema..."
# npx prisma db push

echo "Build complete!"
