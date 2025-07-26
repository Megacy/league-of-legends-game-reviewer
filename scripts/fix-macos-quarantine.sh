#!/bin/bash

# Fix macOS "App is damaged" error for Movlex League Recorder
# This script removes the quarantine attribute that causes the error

APP_NAME="Movlex-League-Recorder.app"
APP_PATH="/Applications/$APP_NAME"

echo "🔧 Fixing macOS quarantine issue for $APP_NAME..."

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: $APP_NAME not found in /Applications/"
    echo "Please make sure you've installed the app from the DMG first."
    exit 1
fi

# Remove quarantine attribute
echo "🗑️  Removing quarantine attribute..."
sudo xattr -rd com.apple.quarantine "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Success! The app should now open without the 'damaged' error."
    echo "🚀 You can now launch $APP_NAME from Applications or Spotlight."
else
    echo "❌ Error: Failed to remove quarantine attribute."
    echo "Please make sure you're running this script with admin privileges."
    exit 1
fi
