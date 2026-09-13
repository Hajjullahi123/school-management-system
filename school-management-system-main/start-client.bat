@echo off
title School Management System - Frontend Client
color 0B
echo.
echo ========================================
echo   School Management System
echo   Starting Frontend Client...
echo ========================================
echo.

cd /d "%~dp0client"

echo Current directory: %CD%
echo.
echo Starting client on port 5173...
echo.
echo IMPORTANT: Keep this window open!
echo Closing this window will stop the client.
echo.
echo ========================================
echo.

npm run dev

pause
