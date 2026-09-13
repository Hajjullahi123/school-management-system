@echo off
cd server
echo Running Prisma migration...
call npx prisma migrate dev --name init_auth
echo Migration complete!
pause
