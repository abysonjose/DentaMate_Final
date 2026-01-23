@echo off
echo ========================================
echo Central Admin Seed Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found
    echo Creating .env from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
    ) else (
        echo ERROR: .env.example file not found
        echo Please create .env file with MONGODB_URI
        pause
        exit /b 1
    )
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Run the seed script
echo Running Central Admin seed...
echo.
node scripts/seed-central-admin.js

if errorlevel 1 (
    echo.
    echo ERROR: Seed script failed
    pause
    exit /b 1
) else (
    echo.
    echo SUCCESS: Central Admin created successfully!
    echo.
    echo You can now login with the credentials shown above.
    echo.
)

pause