#!/bin/bash

# HydroCred Setup Script
echo "🚀 Setting up HydroCred - Green Hydrogen Credit System"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MongoDB is running (optional for development)
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is available"
else
    echo "⚠️  MongoDB not found. Please install MongoDB or use a cloud instance."
    echo "   For local development: https://docs.mongodb.com/manual/installation/"
    echo "   For cloud: https://www.mongodb.com/cloud/atlas"
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo "   Critical: Set MAIN_ADMIN_ADDRESS and PRIVATE_KEY"
    exit 1
else
    echo "✅ .env file exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."

echo "   Installing root dependencies..."
npm install

echo "   Installing backend dependencies..."
cd backend && npm install && cd ..

echo "   Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "   Installing blockchain dependencies..."
cd blockchain && npm install && cd ..

# Compile smart contracts
echo "🔨 Compiling smart contracts..."
cd blockchain
npx hardhat compile
cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start local blockchain: npm run start:blockchain"
echo "3. Deploy contracts: npm run deploy:local"
echo "4. Start backend: npm run start:backend"
echo "5. Start frontend: npm run start:frontend"
echo ""
echo "For full instructions, see README.md"