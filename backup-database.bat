@echo off
echo ========================================
echo  Database Backup Utility
echo ========================================
echo.

REM Create backups folder if it doesn't exist
if not exist "server\prisma\backups" mkdir "server\prisma\backups"

REM Get current date and time for filename
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set mytime=%mytime: =0%

REM Create backup filename
set backupfile=server\prisma\backups\backup_%mydate%_%mytime%.db

REM Copy database file
if exist "server\prisma\dev.db" (
    copy "server\prisma\dev.db" "%backupfile%"
    echo.
    echo ========================================
    echo  Backup Created Successfully!
    echo ========================================
    echo.
    echo Backup saved to: %backupfile%
    echo.
    echo Database size:
    dir "server\prisma\dev.db" | find "dev.db"
    echo.
) else (
    echo.
    echo ERROR: Database file not found!
    echo Please make sure the server has been run at least once.
    echo.
)

echo ========================================
pause
