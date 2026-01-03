@echo off
echo ========================================
echo  Opening Database Viewer (Prisma Studio)
echo ========================================
echo.
echo Starting Prisma Studio...
echo This will open in your browser at http://localhost:5555
echo.
echo Press Ctrl+C to stop the database viewer
echo ========================================
echo.

cd server
npx prisma studio

pause
