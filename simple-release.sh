#!/bin/bash

# Simple Release Script - Just handles version bump and git operations
# GitHub Actions will handle the build and release creation
# Usage: ./simple-release.sh [patch|minor|major]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default version bump type
VERSION_TYPE=${1:-patch}

echo -e "${BLUE}🚀 Simple Release Process${NC}"
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

# Bump version using npm
echo -e "${BLUE}📊 Bumping version (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"

# Commit version bump
echo -e "${BLUE}💾 Committing version bump...${NC}"
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"

# Create and push tag
echo -e "${BLUE}🏷️  Creating tag v${NEW_VERSION}...${NC}"
git tag "v${NEW_VERSION}"
git push origin main
git push origin "v${NEW_VERSION}"

echo -e "${GREEN}✅ Version ${NEW_VERSION} tagged and pushed!${NC}"
echo -e "${YELLOW}🔄 GitHub Actions will now build and create the release automatically${NC}"
echo -e "${BLUE}📍 Check progress at: https://github.com/Megacy/league-of-legends-game-reviewer/actions${NC}"
