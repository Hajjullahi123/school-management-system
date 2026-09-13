@echo off
title Installing Missing Package
color 0E
echo.
echo ========================================
echo   Installing express-fileupload
echo ========================================
echo.

cd /d "%~dp0server"

echo Installing package...
npm install express-fileupload

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Now you can run RUN-SERVER.bat
echo.

pause
