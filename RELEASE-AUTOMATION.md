# Automated Release System

This project uses GitHub Actions for fully automated builds and releases. You just need to bump the version and push a tag.

## Quick Start

### Method 1: Using npm (Recommended)
```bash
# Patch version (1.0.12 → 1.0.13)
npm run release

# Minor version (1.0.12 → 1.1.0)
npm run release:minor

# Major version (1.0.12 → 2.0.0)
npm run release:major
```

### Method 2: Direct script execution
```bash
# Patch version (default)
./simple-release.sh

# Specific version types
./simple-release.sh patch
./simple-release.sh minor
./simple-release.sh major
```

## How it works

### Your Part (Local):
1. **Version bump**: Updates package.json version
2. **Git operations**: Commits version bump, creates and pushes tag

### GitHub Actions Part (Automatic):
1. **Build**: Runs full build process (frontend + electron)
2. **Package**: Creates DMG and ZIP files
3. **Release**: Creates GitHub release with auto-generated notes
4. **Upload**: Uploads all assets including the critical `latest-mac.yml`

## What the automation does

**Local Script (`simple-release.sh`):**
- ✅ Pre-flight checks (main branch, clean working directory)
- ✅ Pulls latest changes
- ✅ Bumps version in package.json
- ✅ Commits and tags the version
- ✅ Pushes to GitHub

**GitHub Actions (`.github/workflows/release.yml`):**
- ✅ Triggered automatically by version tags
- ✅ Builds the app on macOS runners
- ✅ Creates GitHub release with generated notes
- ✅ Uploads DMG, ZIP, and `latest-mac.yml` files
- ✅ Ensures auto-updater works correctly

## Requirements

- Clean git working directory
- Must be on `main` branch
- GitHub Actions enabled (automatic)

## Usage Examples

```bash
# Most common - patch release (bug fixes)
npm run release

# Feature release
npm run release:minor

# Breaking changes
npm run release:major
```

The process ensures that:
- ✅ Your app's auto-updater will work correctly
- ✅ All necessary files are uploaded automatically
- ✅ Version management is handled seamlessly
- ✅ No conflicts between local and remote build processes

## Monitoring

After running the release command, you can monitor the GitHub Actions progress at:
https://github.com/Megacy/league-of-legends-game-reviewer/actions
