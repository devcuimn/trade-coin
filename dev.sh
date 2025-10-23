#!/bin/bash

# Trade Coin - Development Script
# This script starts both frontend and electron in development mode

echo "🚀 Starting Trade Coin Development..."

# Clear yarn cache to avoid permission issues
echo "🧹 Clearing yarn cache..."
yarn cache clean

# Check if node_modules exist
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && yarn install && cd ..
fi

if [ ! -d "electron/node_modules" ]; then
    echo "📦 Installing electron dependencies..."
    cd electron && yarn install && cd ..
fi

echo "🔧 Starting Vite dev server..."
cd frontend && yarn dev &
VITE_PID=$!

# Wait for Vite to start
echo "⏳ Waiting for Vite server to start..."
sleep 8

echo "⚡ Starting Electron..."
cd ../electron && yarn dev:electron &
ELECTRON_PID=$!

echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:5173"
echo "🖥️  Electron: Running"
echo ""
echo "Press Ctrl+C to stop all processes"

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🛑 Stopping development environment..."
    kill $VITE_PID 2>/dev/null
    kill $ELECTRON_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Wait for processes
wait
