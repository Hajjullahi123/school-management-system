@echo off
cd server
echo Regenerating Prisma Client...
call npx prisma generate
echo.
echo Fix complete! Please try running start.bat again.
pause
