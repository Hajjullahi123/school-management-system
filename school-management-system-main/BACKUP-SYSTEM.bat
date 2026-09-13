@echo off
title School Management System - Backup
color 0B
echo.
echo ========================================
echo   School Management System Backup
echo ========================================
echo.

REM Get current date and time for backup folder name
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,8%
set BACKUP_TIME=%datetime:~8,6%
set BACKUP_FOLDER=Backup_%BACKUP_DATE%_%BACKUP_TIME%

echo Creating backup folder: %BACKUP_FOLDER%
echo.

REM Create backup directory
mkdir "%BACKUP_FOLDER%" 2>nul

echo Backing up important files...
echo.

REM Copy all files except node_modules, uploads, and database
echo [1/8] Backing up client source code...
xcopy /E /I /Y "client\src" "%BACKUP_FOLDER%\client\src" /EXCLUDE:backup_exclude.txt >nul
xcopy /E /I /Y "client\public" "%BACKUP_FOLDER%\client\public" >nul
copy /Y "client\*.json" "%BACKUP_FOLDER%\client\" >nul
copy /Y "client\*.js" "%BACKUP_FOLDER%\client\" >nul
copy /Y "client\*.html" "%BACKUP_FOLDER%\client\" >nul

echo [2/8] Backing up server code...
xcopy /E /I /Y "server\routes" "%BACKUP_FOLDER%\server\routes" >nul
xcopy /E /I /Y "server\middleware" "%BACKUP_FOLDER%\server\middleware" >nul
xcopy /E /I /Y "server\utils" "%BACKUP_FOLDER%\server\utils" >nul
xcopy /E /I /Y "server\prisma" "%BACKUP_FOLDER%\server\prisma" >nul
copy /Y "server\*.js" "%BACKUP_FOLDER%\server\" >nul
copy /Y "server\*.json" "%BACKUP_FOLDER%\server\" >nul
copy /Y "server\.env" "%BACKUP_FOLDER%\server\" >nul 2>nul

echo [3/8] Backing up database...
copy /Y "server\prisma\dev.db" "%BACKUP_FOLDER%\server\prisma\" >nul 2>nul
copy /Y "server\prisma\dev.db-journal" "%BACKUP_FOLDER%\server\prisma\" >nul 2>nul

echo [4/8] Backing up documentation...
xcopy /E /I /Y "docs" "%BACKUP_FOLDER%\docs" >nul

echo [5/8] Backing up batch files...
copy /Y "*.bat" "%BACKUP_FOLDER%\" >nul
copy /Y "*.md" "%BACKUP_FOLDER%\" >nul

echo [6/8] Backing up CSV files...
copy /Y "*.csv" "%BACKUP_FOLDER%\" >nul 2>nul

echo [7/8] Backing up uploads folder...
xcopy /E /I /Y "uploads" "%BACKUP_FOLDER%\uploads" >nul 2>nul

echo [8/8] Creating backup summary...

REM Create backup summary file
echo School Management System - Backup Summary > "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Backup Date: %BACKUP_DATE:~0,4%-%BACKUP_DATE:~4,2%-%BACKUP_DATE:~6,2% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Backup Time: %BACKUP_TIME:~0,2%:%BACKUP_TIME:~2,2%:%BACKUP_TIME:~4,2% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Computer Name: %COMPUTERNAME% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo User: %USERNAME% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo BACKUP CONTENTS: >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Client source code (src, public folders) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Client configuration files >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Server routes, middleware, utilities >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Server configuration files >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Environment variables (.env) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Database (dev.db) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Prisma schema and migrations >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Documentation (docs folder) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Batch files for startup >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] README and markdown files >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] CSV data files >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [X] Uploaded files (student photos, etc.) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo NOT BACKED UP (can be reinstalled): >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [ ] node_modules folders (reinstall with: npm install) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo [ ] package-lock.json (auto-generated) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo RESTORE INSTRUCTIONS: >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 1. Copy all files from this backup to your project folder >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 2. Run: npm install (in both client and server folders) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 3. Run: npx prisma generate (in server folder) >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 4. Start the system using batch files >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ================================================ >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"

echo.
echo ========================================
echo   Backup Complete!
echo ========================================
echo.
echo Backup Location: %cd%\%BACKUP_FOLDER%
echo.
echo Summary:
echo - All source code backed up
echo - Database backed up
echo - Configuration files backed up
echo - Documentation backed up
echo - Uploads backed up
echo.
echo Opening backup folder...
explorer "%BACKUP_FOLDER%"
echo.
echo NOTE: To restore, copy files from backup folder
echo       and run 'npm install' in client and server
echo.

pause
