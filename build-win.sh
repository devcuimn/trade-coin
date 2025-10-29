#!/bin/bash

# Trade Coin - Windows Build Script
# Builds production app for Windows using electron-builder

set -euo pipefail

# Always run from repo root
cd "$(dirname "$0")"

echo "🏗️  Building Trade Coin for Windows..."

echo "📦 Ensuring dependencies..."
if [ ! -d "frontend/node_modules" ]; then
  (cd frontend && yarn install)
fi
if [ ! -d "electron/node_modules" ]; then
  (cd electron && yarn install)
fi

echo "🔨 Building frontend..."
(cd frontend && yarn build)

echo "📦 Building Electron app for Windows..."
# Ensure fresh frontend build is copied into electron for packaging/runtime
echo "🔁 Syncing frontend/dist into electron/frontend/dist..."
rm -rf electron/frontend/dist
mkdir -p electron/frontend
cp -R frontend/dist electron/frontend/dist

# The electron package's build script will package the app for Windows
(cd electron && yarn build:electron --win --x64)

echo "✅ Windows build completed successfully!"
echo "📁 Output directory: electron/release/win/"
echo "🎉 Your Windows desktop app is ready!"

