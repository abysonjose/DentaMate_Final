@echo off
echo 🦷 Building DentaMate Project (Fixed Version)...

echo 📋 Step 1: Checking Prerequisites...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    pause
    exit /b 1
)
echo ✅ Docker is available

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    pause
    exit /b 1
)
echo ✅ Node.js is available

echo 📋 Step 2: Setting up environment...
if not exist ".env" (
    copy .env.example .env
    echo ✅ Created .env file from template
) else (
    echo ✅ .env file already exists
)

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

echo Installing Frontend dependencies (with fixes)...
cd frontend
call npm install --legacy-peer-deps
cd ..

echo 📋 Step 4: Building services individually...

echo Building API Gateway...
cd backend\api-gateway
docker build -t dentamate-api-gateway .
cd ..\..

echo Building Auth Service...
cd backend\auth-identity-service
docker build -t dentamate-auth-service .
cd ..\..

echo Building AI Diagnosis Service...
cd backend\ai-diagnosis-service
docker build -t dentamate-ai-service .
cd ..\..

echo Building Frontend...
cd frontend
docker build -t dentamate-frontend .
cd ..

echo 📋 Step 5: Starting core services...
echo Starting MongoDB and Redis...
docker-compose up -d mongodb redis

echo Waiting for databases to be ready...
timeout /t 10 /nobreak >nul

echo Starting application services...
docker-compose up -d api-gateway auth-service ai-diagnosis-service frontend

echo ✅ Build complete! Core services are starting...

echo 🌐 Access your application at:
echo    Frontend: http://localhost:4200
echo    API Gateway: http://localhost:3000
echo    Auth Service: http://localhost:3001
echo    AI Service: http://localhost:5000
echo    MongoDB: localhost:27017

echo 📋 Check service status:
echo    docker-compose ps

echo 📋 View logs:
echo    docker-compose logs -f

echo 📋 Stop services:
echo    docker-compose down

echo 📋 Note: Spring Boot appointment service requires Java 21
echo    Install Java 21 and run: docker-compose up appointment-service

pause