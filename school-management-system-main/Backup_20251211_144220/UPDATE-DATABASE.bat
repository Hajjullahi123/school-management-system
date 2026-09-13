@echo off
title Update Database Schema
color 0C
echo.
echo ===================================================
echo   Updating Database to Match Schema
echo ===================================================
echo.

cd /d "%~dp0server"

echo Pushing schema changes to database...
echo This will add the middleName field and any other changes.
echo.

node node_modules\prisma\build\index.js db push

echo.
echo ===================================================
echo   Database Updated Successfully!
echo ===================================================
echo.
echo The middleName field has been added to the database.
echo You can now add students with middle names!
echo.
echo Please restart your server for changes to take effect.
echo.

pause
