@echo off
echo.
echo =========================================
echo   growmore - System Check
echo =========================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is NOT installed
    echo     Install from: https://nodejs.org/
    set ERRORS=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [✓] Node.js installed: %NODE_VERSION%
)

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm is NOT installed
    set ERRORS=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [✓] npm installed: %NPM_VERSION%
)

REM Check MongoDB (optional)
echo Checking MongoDB...
mongo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] MongoDB is NOT installed locally
    echo     You can use MongoDB Atlas instead
) else (
    echo [✓] MongoDB is installed
)

echo.
echo Checking project structure...

if exist "backend\package.json" (
    echo [✓] Backend directory exists
) else (
    echo [X] Backend directory missing
    set ERRORS=1
)

if exist "frontend\package.json" (
    echo [✓] Frontend directory exists
) else (
    echo [X] Frontend directory missing
    set ERRORS=1
)

if exist "backend\.env" (
    echo [✓] Backend .env file exists
) else (
    echo [!] Backend .env file missing
    echo     Will be created from .env.example
)

if exist "frontend\.env" (
    echo [✓] Frontend .env file exists
) else (
    echo [!] Frontend .env file missing
    echo     Will be created from .env.example
)

echo.
echo Checking dependencies...

if exist "node_modules" (
    echo [✓] Root dependencies installed
) else (
    echo [!] Root dependencies not installed
    echo     Run: npm install
)

if exist "backend\node_modules" (
    echo [✓] Backend dependencies installed
) else (
    echo [!] Backend dependencies not installed
    echo     Run: cd backend && npm install
)

if exist "frontend\node_modules" (
    echo [✓] Frontend dependencies installed
) else (
    echo [!] Frontend dependencies not installed
    echo     Run: cd frontend && npm install
)

echo.
echo =========================================

if defined ERRORS (
    echo   STATUS: ERRORS FOUND
    echo =========================================
    echo.
    echo Please fix the errors above and try again.
    echo.
) else (
    echo   STATUS: ALL CHECKS PASSED!
    echo =========================================
    echo.
    echo Your system is ready to run growmore.
    echo.
    echo Next steps:
    echo   1. Ensure backend/.env has your MongoDB URI
    echo   2. Run: npm run dev
    echo   3. Access: https://growmoreapp2-0.onrender.com
    echo.
)

pause
