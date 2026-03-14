#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Initializing production environment..."

# Move into server directory
cd server

# Ensure persistent directories
mkdir -p logs uploads
echo "[DEBUG] Server directories ensured (server/logs, server/uploads)."

echo ">>> Running database migrations..."
# This pushes schema and generates client
npx prisma db push --accept-data-loss

echo ">>> Seeding production data..."
node prisma/seed-production.js || echo "!!! Seed production failed (continuing)"

echo ">>> Seeding demo data..."
node seed_demo.js || echo "!!! Seed demo failed (continuing)"

echo ">>> Starting application..."
# Start the express server
npm start
