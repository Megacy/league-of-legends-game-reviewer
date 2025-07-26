#!/bin/bash

# Optimized build script for smaller bundle size
# This script temporarily removes dev dependencies during build

echo "🚀 Starting optimized build process..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
npm run build

# Step 2: Backup current package.json and node_modules
echo "💾 Backing up package.json and package-lock.json..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Step 3: Install only production dependencies first
echo "🧹 Installing production dependencies only..."
rm -rf node_modules
npm ci --omit=dev --audit=false

# Step 4: Install electron-builder temporarily (needed for build)
echo "🔧 Installing electron-builder temporarily..."
npm install electron-builder@26.0.12 --no-save --audit=false

# Step 5: Build the Electron app with minimal dependencies
echo "🔨 Building Electron app..."
npx electron-builder

# Step 6: Restore original dependencies
echo "🔄 Restoring development dependencies..."
rm -rf node_modules
mv package.json.backup package.json
mv package-lock.json.backup package-lock.json
npm ci --audit=false

echo "✅ Optimized build complete!"
echo "📊 Check dist/ folder for the smaller builds"
