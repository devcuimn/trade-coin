#!/bin/bash

# Trade Coin - Build Script
# This script builds both frontend and electron for production

echo "🏗️  Building Trade Coin for Production..."

# Check if node_modules exist
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && yarn install && cd ..
fi

if [ ! -d "electron/node_modules" ]; then
    echo "📦 Installing electron dependencies..."
    cd electron && yarn install && cd ..
fi

echo "🔨 Building frontend..."
cd frontend && yarn build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
cd ..

echo "📦 Building Electron app..."
cd electron && yarn build:electron
if [ $? -ne 0 ]; then
    echo "❌ Electron build failed!"
    exit 1
fi
cd ..

echo "✅ Build completed successfully!"
echo "📁 Output directory: electron/release/"
echo ""
echo "🎉 Your desktop app is ready!"
