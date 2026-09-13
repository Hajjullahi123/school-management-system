#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Initializing production environment..."

# Move into server directory
cd server

# Ensure persistent directories
mkdir -p logs uploads uploads/students uploads/teachers uploads/documents uploads/certificates uploads/gallery uploads/news
echo "[DEBUG] Server directories ensured (server/logs, server/uploads)."

echo ">>> Seeding/Updating production users..."
node prisma/seed-production.js || echo "!!! Seed production failed (continuing)"

echo ">>> Running Database Stability Guard..."
node emergency_502_fix.js || echo "!!! Stability check failed (continuing)"
 
echo ">>> Starting application..."
# Start the express server
npm start
