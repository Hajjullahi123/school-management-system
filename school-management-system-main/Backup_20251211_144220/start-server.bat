@echo off
title School Management System - Backend Server
color 0A
echo.
echo ========================================
echo   School Management System
echo   Starting Backend Server...
echo ========================================
echo.

cd /d "%~dp0server"

echo Current directory: %CD%
echo.
echo Starting server on port 5000...
echo.
echo IMPORTANT: Keep this window open!
echo Closing this window will stop the server.
echo.
echo ========================================
echo.

npm run dev

pause
