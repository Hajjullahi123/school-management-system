@echo off
title School Management System - Launcher
color 0E
echo.
echo ========================================
echo   School Management System
echo   Starting All Services...
echo ========================================
echo.
echo This will open 2 windows:
echo   1. Backend Server (Green)
echo   2. Frontend Client (Blue)
echo.
echo Keep both windows open for the system to work!
echo.
echo ========================================
echo.

cd /d "%~dp0"

echo Starting Backend Server...
start "Backend Server" "%~dp0START-SERVER.bat"

timeout /t 3 /nobreak > nul

echo Starting Frontend Client...
start "Frontend Client" "%~dp0START-CLIENT.bat"

echo.
echo ========================================
echo   Both services are starting!
echo ========================================
echo.
echo Wait a few seconds, then open your browser to:
echo   http://localhost:5173
echo.
echo Login with:
echo   Username: admin
echo   Password: admin123
echo.
echo ========================================
echo.
echo You can close THIS window, but keep the
echo GREEN and BLUE windows open!
echo.

pause
