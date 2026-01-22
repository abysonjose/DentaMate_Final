#!/bin/bash

echo "🦷 Setting up DentaMate Development Environment"

# Create necessary directories
mkdir -p logs
mkdir -p backend/ai-diagnosis-service/models
mkdir -p frontend/src/assets/images

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please update the .env file with your actual credentials"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."

# API Gateway
cd backend/api-gateway
npm install
cd ../..

# Auth Service
cd backend/auth-identity-service
npm install
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build and start services
echo "🚀 Starting services with Docker Compose..."
docker-compose up --build -d

echo "✅ DentaMate setup complete!"
echo ""
echo "🌐 Services running at:"
echo "   Frontend: http://localhost:4200"
echo "   API Gateway: http://localhost:3000"
echo "   Auth Service: http://localhost:3001"
echo "   Appointment Service: http://localhost:8080"
echo "   AI Diagnosis Service: http://localhost:5000"
echo ""
echo "📊 MongoDB: localhost:27017"
echo "🔴 Redis: localhost:6379"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Update .env with your actual credentials"
echo "   2. Set up your MongoDB database"
echo "   3. Configure OAuth and payment providers"