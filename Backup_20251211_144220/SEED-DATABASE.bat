@echo off
title Seed Database - Create Classes
color 0A
echo.
echo ========================================
echo   Creating Classes in Database
echo ========================================
echo.

cd /d "%~dp0server"

echo Running seed script...
echo.

node prisma/seed.js

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
echo Now refresh your browser to see the classes!
echo.

pause
