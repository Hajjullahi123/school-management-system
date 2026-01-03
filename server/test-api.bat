@echo off
echo Testing User Creation API...
echo.

REM First login to get token
echo Step 1: Logging in as admin...
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > temp_login.json
echo.

REM Extract token (this is a simple approach, might need adjustment)
echo Step 2: Creating a test teacher...
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN_HERE" -d "{\"username\":\"apitest123\",\"password\":\"test123\",\"email\":\"api@test.com\",\"role\":\"teacher\",\"firstName\":\"API\",\"lastName\":\"Test\",\"staffId\":\"TCH888\",\"specialization\":\"Science\"}"
echo.

pause
