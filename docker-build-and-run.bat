@echo off
echo ========================================
echo DentaMate Docker Build and Run Script
echo ========================================

echo.
echo [1/4] Building Docker images...
docker-compose build --no-cache

if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Starting core services (MongoDB, Redis, Auth, Tenant)...
docker-compose up -d mongodb redis auth-service tenant-organization-service

echo Waiting for core services to initialize...
timeout /t 30 /nobreak

echo.
echo [3/4] Starting main application services...
docker-compose up -d api-gateway user-staff-service ai-diagnosis-service token-queue-service

echo Waiting for services to initialize...
timeout /t 20 /nobreak

echo.
echo [4/4] Starting frontend...
docker-compose up -d frontend

echo.
echo ========================================
echo DentaMate is starting up...
echo ========================================
echo.
echo Services will be available at:
echo - Frontend: http://localhost:4200
echo - API Gateway: http://localhost:3000
echo - Auth Service: http://localhost:3001
echo - AI Diagnosis: http://localhost:8003
echo.
echo Checking service status...
docker-compose ps

echo.
echo To view logs: docker-compose logs -f [service-name]
echo To stop all: docker-compose down
echo.
pause