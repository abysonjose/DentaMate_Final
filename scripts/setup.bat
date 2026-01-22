@echo off
echo 🦷 Setting up DentaMate Development Environment

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "backend\ai-diagnosis-service\models" mkdir backend\ai-diagnosis-service\models
if not exist "frontend\src\assets\images" mkdir frontend\src\assets\images

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
    echo ✅ Created .env file from template
    echo ⚠️  Please update the .env file with your actual credentials
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...

REM API Gateway
cd backend\api-gateway
call npm install
cd ..\..

REM Auth Service
cd backend\auth-identity-service
call npm install
cd ..\..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Build and start services
echo 🚀 Starting services with Docker Compose...
docker-compose up --build -d

echo ✅ DentaMate setup complete!
echo.
echo 🌐 Services running at:
echo    Frontend: http://localhost:4200
echo    API Gateway: http://localhost:3000
echo    Auth Service: http://localhost:3001
echo    Appointment Service: http://localhost:8080
echo    AI Diagnosis Service: http://localhost:5000
echo.
echo 📊 MongoDB: localhost:27017
echo 🔴 Redis: localhost:6379
echo.
echo ⚠️  Don't forget to:
echo    1. Update .env with your actual credentials
echo    2. Set up your MongoDB database
echo    3. Configure OAuth and payment providers

pause