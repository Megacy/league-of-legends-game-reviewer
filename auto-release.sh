#!/bin/bash

# Auto Release Script - Fully Automated Build, Version, and Release
# Usage: ./auto-release.sh [patch|minor|major]
# Default: patch

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default version bump type
VERSION_TYPE=${1:-patch}

echo -e "${BLUE}🚀 Starting Automated Release Process${NC}"
echo -e "${YELLOW}Version bump type: ${VERSION_TYPE}${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Not on main branch. Current branch: $CURRENT_BRANCH${NC}"
    echo "Please switch to main branch first: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
    echo "Please commit or stash your changes first"
    exit 1
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin main

# Check if GH_TOKEN is set
if [ -z "$GH_TOKEN" ]; then
    echo -e "${RED}❌ Error: GH_TOKEN environment variable is not set${NC}"
    echo "Please set your GitHub token: export GH_TOKEN=your_token_here"
    exit 1
fi

# Bump version using npm
echo -e "${BLUE}📊 Bumping version (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Clean dist directory if it exists
if [ -d "dist" ]; then
    echo -e "${YELLOW}🧹 Cleaning dist directory...${NC}"
    rm -rf dist
fi

# Build with electron-builder
echo -e "${BLUE}📦 Building with electron-builder...${NC}"
npm run electron:build

# Check if latest-mac.yml was generated
if [ ! -f "dist/latest-mac.yml" ]; then
    echo -e "${RED}❌ Error: latest-mac.yml was not generated${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Commit version bump
echo -e "${BLUE}💾 Committing version bump...${NC}"
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"

# Create and push tag
echo -e "${BLUE}🏷️  Creating tag v${NEW_VERSION}...${NC}"
git tag "v${NEW_VERSION}"
git push origin main
git push origin "v${NEW_VERSION}"

# Create GitHub release and upload assets
echo -e "${BLUE}🚀 Creating GitHub release...${NC}"
gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --generate-notes \
    --draft=false \
    --prerelease=false \
    dist/*.dmg \
    dist/*.zip \
    dist/latest-mac.yml

echo -e "${GREEN}✅ Release v${NEW_VERSION} created successfully!${NC}"

# Verify the release
echo -e "${BLUE}🔍 Verifying release assets...${NC}"
ASSETS=$(gh release view "v${NEW_VERSION}" --json assets --jq '.assets[].name')
echo -e "${YELLOW}Release assets:${NC}"
echo "$ASSETS"

# Check if latest-mac.yml is in the assets
if echo "$ASSETS" | grep -q "latest-mac.yml"; then
    echo -e "${GREEN}✅ latest-mac.yml is present in release${NC}"
else
    echo -e "${RED}❌ Warning: latest-mac.yml not found in release assets${NC}"
fi

# Test update file accessibility
echo -e "${BLUE}🔍 Testing update file accessibility...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://github.com/Megacy/league-of-legends-game-reviewer/releases/download/v${NEW_VERSION}/latest-mac.yml")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ Update file is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ Warning: Update file not accessible (HTTP $HTTP_STATUS)${NC}"
fi

echo -e "${GREEN}🎉 Automated release process completed successfully!${NC}"
echo -e "${YELLOW}Your app should now be able to auto-update to v${NEW_VERSION}${NC}"
