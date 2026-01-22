@echo off
echo 🦷 DentaMate Quick Start (Core Services Only)

echo 📋 Starting core services...
docker-compose -f docker-compose-core.yml up --build -d

echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

echo ✅ Core services started!

echo 🌐 Access your application:
echo    Frontend (Dev): http://localhost:4200
echo    API Gateway: http://localhost:3000  
echo    Auth Service: http://localhost:3001
echo    AI Service: http://localhost:5000
echo    MongoDB: localhost:27017
echo    Redis: localhost:6379

echo 📋 Check status: docker-compose -f docker-compose-core.yml ps
echo 📋 View logs: docker-compose -f docker-compose-core.yml logs -f
echo 📋 Stop: docker-compose -f docker-compose-core.yml down

echo 📝 Note: This starts the core Node.js and Python services.
echo    For the full Java Spring Boot service, ensure Java 21 is installed.

pause