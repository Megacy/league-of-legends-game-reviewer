#!/bin/bash

# Quick Release Script - Ensures environment is set up correctly
# Usage: ./release-now.sh [patch|minor|major]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Movlex League Recorder - Quick Release${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You're not logged in to GitHub CLI${NC}"
    echo -e "${BLUE}🔐 Logging in...${NC}"
    gh auth login
fi

# Set GH_TOKEN from gh auth token
export GH_TOKEN=$(gh auth token)

if [ -z "$GH_TOKEN" ]; then
    echo -e "${RED}❌ Error: Could not get GitHub token${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub authentication verified${NC}"

# Run the automated release
./auto-release.sh $1
