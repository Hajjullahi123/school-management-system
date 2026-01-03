@echo off
cd server
echo Seeding database...
node prisma/seed.js
echo Seeding complete!
pause
