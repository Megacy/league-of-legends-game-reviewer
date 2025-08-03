# Automated Release System

This project now includes a fully automated release system that handles everything with a single command.

## Quick Start

### Method 1: Using npm (Recommended)
```bash
# Patch version (1.0.11 → 1.0.12)
npm run release:now

# Minor version (1.0.11 → 1.1.0)
npm run release:now:minor

# Major version (1.0.11 → 2.0.0)
npm run release:now:major
```

### Method 2: Direct script execution
```bash
# Patch version (default)
./release-now.sh

# Specific version types
./release-now.sh patch
./release-now.sh minor
./release-now.sh major
```

## What the automation does

1. **Pre-flight checks**: Ensures you're on main branch, no uncommitted changes, pulls latest code
2. **Authentication**: Automatically handles GitHub CLI authentication
3. **Version bump**: Updates package.json version
4. **Build**: Runs full build process (npm run build + electron-builder)
5. **Git operations**: Commits version bump, creates and pushes tags
6. **GitHub release**: Creates release with auto-generated notes
7. **Asset upload**: Uploads DMG, ZIP, and critically the `latest-mac.yml` file
8. **Verification**: Checks that all assets are properly uploaded and accessible

## Requirements

- GitHub CLI (`gh`) - Install with `brew install gh`
- Clean git working directory
- Must be on `main` branch

## First Time Setup

1. Install GitHub CLI: `brew install gh`
2. Login: `gh auth login` (only needed once)
3. That's it! The scripts handle everything else.

## Usage Examples

```bash
# Most common - patch release (bug fixes)
npm run release:now

# Feature release
npm run release:now:minor

# Breaking changes
npm run release:now:major
```

The automation ensures that:
- Your app's auto-updater will work correctly
- All necessary files are uploaded
- Version management is handled automatically
- No manual steps required

## Files

- `auto-release.sh` - Core automation script
- `release-now.sh` - Wrapper that handles authentication
- `package.json` - Updated with new release scripts

## Legacy Scripts (Deprecated)

- `release.sh` - Old manual release script
- `publish-release.sh` - Old manual publish script

Use the new `npm run release:now` instead!
