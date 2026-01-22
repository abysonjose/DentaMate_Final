@echo off
echo 🦷 Building DentaMate Project...

echo.
echo 📋 Step 1: Checking Prerequisites...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not running
    echo Please install Docker Desktop and make sure it's running
    pause
    exit /b 1
)
echo ✅ Docker is available

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js is available

echo.
echo 📋 Step 2: Setting up environment...
if not exist ".env" (
    copy .env.example .env
    echo ✅ Created .env file from template
) else (
    echo ✅ .env file already exists
)

echo.
echo 📋 Step 3: Installing dependencies...
echo Installing root dependencies...
call npm install

echo Installing API Gateway dependencies...
cd backend\api-gateway
call npm install
cd ..\..

echo Installing Auth Service dependencies...
cd backend\auth-identity-service
call npm install
cd ..\..

echo Installing Frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo 📋 Step 4: Building and starting services...
echo Starting all services with Docker Compose...
docker-compose up --build -d

echo.
echo ✅ Build complete! Services are starting...
echo.
echo 🌐 Access your application at:
echo    Frontend: http://localhost:4200
echo    API Gateway: http://localhost:3000
echo    MongoDB: localhost:27017
echo.
echo 📊 Check service status:
echo    docker-compose ps
echo.
echo 📝 View logs:
echo    docker-compose logs -f
echo.
echo 🛑 Stop services:
echo    docker-compose down
echo.
pause