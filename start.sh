#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Initializing production environment..."

# Move into server directory
cd server

# Ensure persistent directories
mkdir -p logs uploads
echo "[DEBUG] Server directories ensured (server/logs, server/uploads)."

echo ">>> Seeding/Updating production users..."
node prisma/seed-production.js || echo "!!! Seed production failed (continuing)"
 
echo ">>> Starting application..."
# Start the express server
npm start
