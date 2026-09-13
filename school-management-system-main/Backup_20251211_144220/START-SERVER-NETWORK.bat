@echo off
echo ========================================
echo   SCHOOL MANAGEMENT SYSTEM
echo   Local Network Server Startup
echo ========================================
echo.

REM Get the computer's IP address
echo Detecting your IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)

:found
REM Remove leading spaces
set IP=%IP:~1%
echo.
echo ========================================
echo   YOUR SERVER IP ADDRESS: %IP%
echo ========================================
echo.
echo Other computers can access the site at:
echo   http://%IP%:5173
echo.
echo Make sure to:
echo   1. Update client/src/config.js with this IP
echo   2. Keep this window open while using the system
echo   3. Connect other computers to the same network
echo.
echo ========================================
echo.

REM Change to server directory
cd /d "%~dp0server"

echo Starting Backend Server...
echo Server will run on: http://%IP%:3000
echo.

REM Start the server
npm start

pause
