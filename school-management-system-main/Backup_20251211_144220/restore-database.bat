@echo off
echo ========================================
echo  Database Restore Utility
echo ========================================
echo.

REM Check if backups folder exists
if not exist "server\prisma\backups" (
    echo ERROR: No backups folder found!
    echo Please create a backup first using backup-database.bat
    echo.
    pause
    exit /b
)

echo Available backups:
echo.
dir /b "server\prisma\backups\*.db"
echo.
echo ========================================
echo.

set /p backupname="Enter the backup filename to restore (or press Enter to cancel): "

if "%backupname%"=="" (
    echo Restore cancelled.
    pause
    exit /b
)

if exist "server\prisma\backups\%backupname%" (
    echo.
    echo WARNING: This will replace your current database!
    set /p confirm="Are you sure? (yes/no): "
    
    if /i "%confirm%"=="yes" (
        copy "server\prisma\backups\%backupname%" "server\prisma\dev.db" /y
        echo.
        echo ========================================
        echo  Database Restored Successfully!
        echo ========================================
        echo.
        echo Restored from: %backupname%
        echo.
    ) else (
        echo Restore cancelled.
    )
) else (
    echo.
    echo ERROR: Backup file not found!
    echo.
)

pause
