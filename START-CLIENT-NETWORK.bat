@echo off
echo ========================================
echo   SCHOOL MANAGEMENT SYSTEM
echo   Local Network Client Startup
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
echo The website will be accessible at:
echo   http://%IP%:5173
echo.
echo Share this URL with:
echo   - Teachers
echo   - Students
echo   - Accountants
echo   - Administrators
echo.
echo IMPORTANT:
echo   - Make sure START-SERVER-NETWORK.bat is running first!
echo   - All users must be on the same network
echo   - Keep this window open while using the system
echo.
echo ========================================
echo.

REM Change to client directory
cd /d "%~dp0client"

echo Starting Frontend (Website)...
echo.

REM Start the client with network access
npm run dev -- --host

pause
