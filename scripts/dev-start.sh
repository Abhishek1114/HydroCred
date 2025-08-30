#!/bin/bash

# HydroCred Development Startup Script
echo "🚀 Starting HydroCred Development Environment"
echo "============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup first: npm run setup"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check required ports
echo "🔍 Checking required ports..."
check_port 8545 || echo "   Blockchain node may already be running"
check_port 5055 || echo "   Backend may already be running"
check_port 5173 || echo "   Frontend may already be running"

# Start MongoDB if not running (optional)
if command -v mongod &> /dev/null; then
    if ! pgrep mongod > /dev/null; then
        echo "🍃 Starting MongoDB..."
        sudo systemctl start mongod 2>/dev/null || echo "   Please start MongoDB manually"
    else
        echo "✅ MongoDB is running"
    fi
fi

echo ""
echo "Starting services in order:"
echo "1. Blockchain node (Hardhat)"
echo "2. Backend API"
echo "3. Frontend"
echo ""

# Option to start all services
read -p "Start all services? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting all services..."
    npm run start
else
    echo "Manual startup commands:"
    echo "  Blockchain: npm run start:blockchain"
    echo "  Backend:    npm run start:backend"
    echo "  Frontend:   npm run start:frontend"
    echo "  All:        npm run start"
fi