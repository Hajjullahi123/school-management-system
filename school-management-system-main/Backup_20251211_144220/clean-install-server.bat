@echo off
cd server
echo ==========================================
echo Performing CLEAN install of Server dependencies
echo ==========================================

echo 1. Removing old node_modules...
rmdir /s /q node_modules
del package-lock.json

echo 2. Installing dependencies (this may take a few minutes)...
call npm install

echo 3. Regenerating Prisma Client...
call npx prisma generate

echo.
echo ==========================================
echo Clean install complete!
echo ==========================================
echo Now try running start.bat again.
pause
