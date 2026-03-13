#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Starting production server..."

cd server

echo ">>> Running database migrations..."
npx prisma db push --accept-data-loss

echo ">>> Seeding production data..."
node prisma/seed-production.js || echo "!!! Seed production failed (continuing)"

echo ">>> Seeding demo data..."
node seed_demo.js || echo "!!! Seed demo failed (continuing)"

echo ">>> Starting application..."
npm start
