#!/bin/bash

# Release script for League of Legends Game Reviewer
# Usage: ./release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo "🚀 Starting release process..."

# Make sure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Please switch to main branch before releasing"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Make sure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    git status --short
    exit 1
fi

# Pull latest changes
echo "📡 Pulling latest changes..."
git pull origin main

# Bump version
echo "📈 Bumping version ($RELEASE_TYPE)..."
npm version $RELEASE_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ New version: $NEW_VERSION"

# Commit version bump
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo "🎉 Release v$NEW_VERSION initiated!"
echo "📦 GitHub Actions will build and publish the release automatically."
echo "🔗 Check progress at: https://github.com/Megacy/league-of-legends-game-reviewer/actions"
