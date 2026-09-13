@echo off
echo ========================================
echo Applying Database Migration
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Stopping server (if running)...
echo Please make sure your server is STOPPED before continuing!
echo.
pause

echo Step 2: Backing up database...
copy prisma\dev.db prisma\dev.db.before_migration_backup
echo Backup created: prisma\dev.db.before_migration_backup
echo.

echo Step 3: Applying SQL migration...
sqlite3 prisma\dev.db < MANUAL_MIGRATION.sql

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Migration failed! Check if sqlite3 is installed.
    echo Please install SQLite from: https://www.sqlite.org/download.html
    pause
    exit /b 1
)

echo Migration SQL executed successfully!
echo.

echo Step 4: Regenerating Prisma Client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Next step: Start your server with:  npm run dev
echo.
pause
