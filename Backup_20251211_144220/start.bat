@echo off
echo ========================================
echo  School Management System - Starting
echo ========================================
echo.
echo Starting server and client...
echo.
echo Server will run on: http://localhost:3000
echo Client will run on: http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop
echo ========================================
echo.

start "School System - Server" cmd /k "cd server && npm start"
timeout /t 3 /nobreak > nul
start "School System - Client" cmd /k "cd client && npm run dev"

echo.
echo Both server and client are starting in separate windows...
echo.
pause
