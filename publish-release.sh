#!/bin/bash

# Script to properly publish a release with latest-mac.yml
# Usage: ./publish-release.sh

set -e

echo "🔧 Building application..."
npm run build

echo "📦 Building electron packages..."
GH_TOKEN=$(gh auth token) npx electron-builder --publish=never

echo "📤 Checking if latest-mac.yml exists..."
if [ ! -f "dist/latest-mac.yml" ]; then
    echo "❌ latest-mac.yml not found! Build may have failed."
    exit 1
fi

echo "✅ latest-mac.yml found, uploading to latest release..."

# Get the latest version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "📤 Uploading latest-mac.yml to release $TAG..."
gh release upload "$TAG" dist/latest-mac.yml --repo Megacy/league-of-legends-game-reviewer || echo "⚠️  File might already exist"

echo "🎉 Release published successfully!"
echo "📋 Files in release:"
gh release view "$TAG" --repo Megacy/league-of-legends-game-reviewer | grep "asset:"
