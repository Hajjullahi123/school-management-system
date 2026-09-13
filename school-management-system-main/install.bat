@echo off
echo ========================================
echo  School Management System - Setup
echo ========================================
echo.
echo Installing server dependencies...
cd server
call npm install
echo.
echo Installing client dependencies...
cd ..\client
call npm install
echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo You can now run "start.bat" to launch the application.
echo.
pause
