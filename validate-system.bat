@echo off
echo ========================================
echo DentaMate System Validation Script
echo ========================================
echo.

echo [INFO] Validating DentaMate containerized system...
echo.

echo [1/6] Checking Docker service status...
docker-compose ps
echo.

echo [2/6] Testing infrastructure services...
echo Testing MongoDB connection...
timeout /t 2 /nobreak >nul
curl -s http://localhost:27017 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ MongoDB: Accessible
) else (
    echo ❌ MongoDB: Not accessible
)

echo Testing Redis connection...
timeout /t 1 /nobreak >nul
echo ping | telnet localhost 6379 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Redis: Accessible  
) else (
    echo ❌ Redis: Not accessible
)
echo.

echo [3/6] Testing authentication service...
curl -s -o nul -w "Auth Service (3001): %%{http_code}\n" http://localhost:3001/health
echo.

echo [4/6] Testing core services...
curl -s -o nul -w "API Gateway (3000): %%{http_code}\n" http://localhost:3000/health
curl -s -o nul -w "User Staff Service (3004): %%{http_code}\n" http://localhost:3004/health  
curl -s -o nul -w "Tenant Service (3003): %%{http_code}\n" http://localhost:3003/health
echo.

echo [5/6] Testing service connectivity...
echo Testing API Gateway → Auth Service routing...
curl -s -o nul -w "Gateway→Auth: %%{http_code}\n" http://localhost:3000/api/auth/health

echo Testing API Gateway → User Staff routing...
curl -s -o nul -w "Gateway→Staff: %%{http_code}\n" http://localhost:3000/api/staff/health
echo.

echo [6/6] Memory usage check...
echo Docker container memory usage:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo.

echo ========================================
echo Validation Complete!
echo ========================================
echo.

echo Next steps for full validation:
echo 1. Test authentication flow:
echo    curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@dentamate.com\",\"password\":\"admin123\"}"
echo.
echo 2. Test doctor dashboard access:
echo    curl -H "Authorization: Bearer [token]" http://localhost:3000/api/dashboard/doctor
echo.
echo 3. Start extended services for full testing:
echo    docker-compose --profile extended up -d
echo.

pause