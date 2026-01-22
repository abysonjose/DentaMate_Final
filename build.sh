#!/bin/bash

echo "🦷 Building DentaMate Project..."

echo ""
echo "📋 Step 1: Checking Prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker from https://docker.com"
    exit 1
fi
echo "✅ Docker is available"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js is available"

echo ""
echo "📋 Step 2: Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📋 Step 3: Installing dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing API Gateway dependencies..."
cd backend/api-gateway
npm install
cd ../..

echo "Installing Auth Service dependencies..."
cd backend/auth-identity-service
npm install
cd ../..

echo "Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "📋 Step 4: Building and starting services..."
echo "Starting all services with Docker Compose..."
docker-compose up --build -d

echo ""
echo "✅ Build complete! Services are starting..."
echo ""
echo "🌐 Access your application at:"
echo "   Frontend: http://localhost:4200"
echo "   API Gateway: http://localhost:3000"
echo "   MongoDB: localhost:27017"
echo ""
echo "📊 Check service status:"
echo "   docker-compose ps"
echo ""
echo "📝 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""