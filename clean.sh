#!/bin/bash

# Trade Coin - Clean Script
# This script cleans all build files and node_modules

echo "🧹 Cleaning Trade Coin..."

echo "🗑️  Removing node_modules..."
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf electron/node_modules

echo "🗑️  Removing build files..."
rm -rf frontend/dist
rm -rf electron/release

echo "🗑️  Removing lock files..."
rm -f package-lock.json
rm -f frontend/package-lock.json
rm -f electron/package-lock.json
rm -f yarn.lock
rm -f frontend/yarn.lock
rm -f electron/yarn.lock

echo "✅ Clean completed!"
echo ""
echo "💡 Run ./install.sh to reinstall dependencies"
