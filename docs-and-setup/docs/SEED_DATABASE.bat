@echo off
echo ========================================
echo Seeding MongoDB Database
echo ========================================
echo.

cd backend

echo Checking MongoDB connection...
echo.

node seed.js

echo.
echo ========================================
echo.
if %ERRORLEVEL% EQU 0 (
    echo ✓ Database seeded successfully!
    echo.
    echo Default Credentials:
    echo   Admin:      7777777777 / admin123
    echo   Supervisor: 8888888888 / super123
    echo   Driver:     9999999999 / driver123
) else (
    echo ✗ Seeding failed. Check the error above.
    echo.
    echo Common issues:
    echo   1. MongoDB password incorrect in .env file
    echo   2. IP not whitelisted in MongoDB Atlas
    echo   3. Network connection issues
)

echo.
pause
