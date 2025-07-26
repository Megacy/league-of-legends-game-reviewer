# Release Process

This document explains how to release new versions of the League of Legends Game Reviewer app.

## Prerequisites

1. You must have push access to the repository
2. Make sure you're on the `main` branch
3. Ensure all changes are committed and pushed

## Release Process

### Automated Release (Recommended)

Use the provided release script:

```bash
# Patch release (1.0.0 → 1.0.1)
npm run version:patch

# Minor release (1.0.0 → 1.1.0) 
npm run version:minor

# Major release (1.0.0 → 2.0.0)
npm run version:major
```

### Manual Release

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Commit and tag:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.X.X"
   git tag "vX.X.X"
   ```

3. **Push changes:**
   ```bash
   git push origin main
   git push origin vX.X.X
   ```

4. **GitHub Actions will automatically:**
   - Build the app for macOS
   - Create a GitHub release
   - Upload the built files
   - Generate update metadata

## Testing Updates

### In Development

1. **Start the test update server:**
   ```bash
   npm run test-update-server
   ```

2. **Modify electron-main.js temporarily** to use local server:
   ```js
   // Add this in development
   if (!app.isPackaged) {
     autoUpdater.setFeedURL('http://localhost:3001');
   }
   ```

3. **Test the update flow** in your development app

### Production Testing

1. **Create a test release** with a higher version number
2. **Install the current version** of your app
3. **Trigger update check** through the settings menu
4. **Verify the update downloads and installs**

## Release Checklist

- [ ] All features tested and working
- [ ] Version number updated appropriately
- [ ] Release notes prepared
- [ ] Changes committed to main branch
- [ ] Tag created and pushed
- [ ] GitHub Actions build succeeded
- [ ] GitHub release created with correct files
- [ ] Auto-updater tested from previous version

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Ensure all dependencies are correctly listed
- Verify electron-builder configuration

### Updates Not Detected
- Check that `latest-mac.yml` is generated in the release
- Verify the GitHub repository URL in package.json
- Ensure the app is properly signed (for production)

### Update Download Fails
- Check network connectivity
- Verify GitHub release files are accessible
- Check electron-updater logs in the app

## File Structure After Release

A successful release creates these files:
```
GitHub Release Assets:
├── Movlex-League-Recorder-X.X.X-arm64.dmg
├── Movlex-League-Recorder-X.X.X-arm64-mac.zip
├── latest-mac.yml (auto-updater metadata)
└── Source code archives
```

The auto-updater uses `latest-mac.yml` to check for updates and `*.zip` file for downloads.
