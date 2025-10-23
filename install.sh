#!/bin/bash

# Trade Coin - Install Script
# This script installs all dependencies for both frontend and electron

echo "📦 Installing Trade Coin Dependencies..."

# Clear yarn cache to avoid permission issues
echo "🧹 Clearing yarn cache..."
yarn cache clean

echo "🔧 Installing root dependencies..."
yarn install

echo "🎨 Installing frontend dependencies..."
cd frontend && yarn install && cd ..

echo "⚡ Installing electron dependencies..."
cd electron && yarn install && cd ..

echo "✅ All dependencies installed successfully!"
echo ""
echo "🚀 You can now run:"
echo "   ./dev.sh    - Start development"
echo "   ./build.sh  - Build for production"
