@echo off
echo ========================================
echo MongoDB Atlas Setup Script
echo ========================================
echo.

echo Step 1: Creating .env file...
echo.

if not exist "backend\.env" (
    echo Creating backend\.env file...
    (
        echo # MongoDB Atlas Connection
        echo # Replace YOUR_PASSWORD with your actual MongoDB password
        echo MONGODB_URI=mongodb+srv://tech_db_user:YOUR_PASSWORD@growmore.kxyq1qh.mongodb.net/growmore?retryWrites=true^&w=majority^&appName=Growmore
        echo.
        echo # JWT Secret
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # Frontend URL
        echo FRONTEND_URL=https://growmoreapp2-0.onrender.com
        echo.
        echo # Server Port
        echo PORT=5000
    ) > backend\.env
    echo ✓ Created backend\.env file
) else (
    echo - backend\.env already exists
)

echo.
echo ========================================
echo IMPORTANT: Next Steps
echo ========================================
echo.
echo 1. Open backend\.env file
echo 2. Replace YOUR_PASSWORD with your actual MongoDB password
echo 3. Save the file
echo 4. Make sure your IP is whitelisted in MongoDB Atlas Network Access
echo 5. Run: cd backend ^&^& node seed.js
echo.
echo ========================================
echo.
pause
