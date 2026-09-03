@echo off
echo.
echo ======================================
echo   growmore - Setup Script
echo ======================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo [4/4] Checking environment files...
if not exist "backend\.env" (
    echo Creating backend/.env from example...
    copy backend\.env.example backend\.env >nul
)

if not exist "frontend\.env" (
    echo Creating frontend/.env from example...
    copy frontend\.env.example frontend\.env >nul
)

echo.
echo ======================================
echo   SETUP COMPLETE!
echo ======================================
echo.
echo Next steps:
echo   1. Update backend/.env with your MongoDB URI
echo   2. Run: npm run dev
echo   3. Open https://growmoreapp2-0.onrender.com
echo.
echo Login credentials:
echo   Driver: 9999999999 / driver123
echo   Supervisor: 8888888888 / super123
echo.
pause
