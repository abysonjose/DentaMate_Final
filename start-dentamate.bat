@echo off
echo ========================================
echo DentaMate Containerized Startup Script
echo ========================================
echo.

echo [INFO] Starting DentaMate containerized system...
echo [INFO] This will start services in memory-optimized order
echo.

echo [1/5] Starting infrastructure services...
echo - MongoDB (Database)
echo - Redis (Cache)
docker-compose up -d mongodb redis

echo.
echo [2/5] Waiting for infrastructure to initialize...
timeout /t 15 /nobreak

echo.
echo [3/5] Starting core authentication services...
echo - Auth Identity Service
echo - Tenant Organization Service
docker-compose up -d auth-service tenant-organization-service

echo.
echo [4/5] Waiting for auth services to initialize...
timeout /t 10 /nobreak

echo.
echo [5/5] Starting main application services...
echo - API Gateway
echo - User Staff Service
docker-compose up -d api-gateway user-staff-service

echo.
echo ========================================
echo DentaMate Core Services Started!
echo ========================================
echo.
echo Services Status:
docker-compose ps

echo.
echo Available Endpoints:
echo - API Gateway: http://localhost:3000
echo - Auth Service: http://localhost:3001
echo - User Staff Service: http://localhost:3004
echo - Tenant Service: http://localhost:3003
echo - MongoDB: localhost:27017
echo - Redis: localhost:6379
echo.

echo To start extended services (AI, Frontend):
echo   docker-compose --profile extended up -d
echo.
echo To view logs:
echo   docker-compose logs -f [service-name]
echo.
echo To stop all services:
echo   docker-compose down
echo.

echo [SUCCESS] DentaMate core system is ready!
pause