# League of Legends Game Reviewer Desktop App

A modern desktop app for reviewing League of Legends games, built with Electron, React, and Vite. The app records your gameplay using either bundled ffmpeg or OBS WebSocket, tags in-game events, and provides a timeline-based review UI with clip export and event filtering.

## Features
- **Auto-detects game start/end** and records gameplay using ffmpeg or OBS
- **Dual Recording Modes**:
  - **FFmpeg Mode**: Built-in recording using bundled ffmpeg (no OBS required) - Apple Silicon/macOS optimized
  - **OBS Mode**: Connect to OBS via WebSocket for advanced recording features and streaming
- **Timeline review**: Jump to events, filter by event type, and create/export video clips  
- **Modern UI**: Responsive, user-friendly, with error handling, persistent settings, and robust logging
- **Video settings**: Choose screen, framerate, resolution, quality, and more (persisted across sessions)
- **Event tagging**: All in-game events are saved to a `.events.json` file alongside each recording (always saved, even if empty)
- **Permissions-aware**: App checks for and guides user to grant Screen Recording (and optionally Mic) permissions on macOS
- **Persistent logging**: All backend errors and key actions are logged to `app.log` in the user data directory

## Recording Modes

### FFmpeg Mode (Default)
- Uses bundled ffmpeg binary with avfoundation (no external dependencies)
- Direct screen capture with configurable settings
- Best for simple recording without streaming

### OBS Mode
- Connects to OBS via WebSocket (requires OBS Studio with WebSocket plugin)
- Supports all OBS features including scenes, sources, filters, and streaming
- Clips are still created using ffmpeg for optimal performance
- Configure in Video Settings:
  - WebSocket address (default: `ws://127.0.0.1:4455`)
  - WebSocket password (if configured in OBS)
  - Scene to switch to when recording (optional)

## Installation

### Download
Download the latest release from the [Releases page](https://github.com/Megacy/league-of-legends-game-reviewer/releases).

### macOS Installation
⚠️ **Important**: Due to macOS security restrictions, you may see an error that the app is "damaged and can't be opened." This is normal for unsigned apps.

**Quick Fix:**
```bash
# After installing the app to /Applications, run:
sudo xattr -rd com.apple.quarantine "/Applications/Movlex-League-Recorder.app"
```

**Alternative**: Use the included fix script:
```bash
# Download and run the fix script
curl -O https://raw.githubusercontent.com/Megacy/league-of-legends-game-reviewer/main/scripts/fix-macos-quarantine.sh
chmod +x fix-macos-quarantine.sh
./fix-macos-quarantine.sh
```

For detailed installation instructions, see [MACOS-INSTALL.md](MACOS-INSTALL.md).

## Getting Started
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the app (development):
   ```sh
   npm run dev
   ```
3. Build for production:
   ```sh
   npm run build:prod
   ```
4. Set your recordings directory in the app settings
5. Choose your recording mode in Video Settings:
   - **FFmpeg Mode**: Select screen and configure recording settings
   - **OBS Mode**: Set up OBS WebSocket connection and test connectivity
6. Start a game: The app will auto-record, tag events, and let you review and export clips after

## OBS Setup (for OBS Mode)
1. Install OBS Studio
2. Enable WebSocket Server in OBS: Tools > WebSocket Server Settings
3. Note the server address and password
4. Configure these settings in the app's Video Settings
5. Test the connection before recording

## Requirements
- League of Legends client installed and running
- macOS (Apple Silicon or Intel)
- Screen Recording permission (prompted on first run)
- For OBS Mode: OBS Studio with WebSocket Server enabled

## Troubleshooting
- **FFmpeg Mode**: If your screen is not being recorded, ensure the app has Screen Recording permission in System Settings > Privacy & Security.
- **OBS Mode**: If connection fails, verify OBS is running with WebSocket Server enabled and the address/password are correct.
- If only one screen appears, or no devices are listed, grant permission and restart the app.
- If no events are detected, ensure the League client is running and the Live Client Data API is enabled.
- All errors and recording issues are logged to `app.log` in the user data directory.

## Code Structure
- **Electron Main Process (`electron-main.js`)**: Handles app lifecycle, IPC, ffmpeg control, League polling, event recording, permissions, and logging.
- **Preload Script (`preload.js`)**: Exposes a secure API (`window.electronAPI`) for frontend/backend communication.
- **Frontend (React + Vite + TypeScript)**: Main UI, timeline, video review, permissions modal, and clip creation logic.
- **Types**: Shared types in `src/types/electron-api.d.ts`.
- **Backend Modules**: `leaguePoller.js` (League polling), `eventRecorder.js` (event recording, always writes a file)

## Types
- `EventData`: Used for all event objects in the app. See `src/types/electron-api.d.ts` for details.
- `VideoSettings`: Used for all persisted video settings.

## Persistent Settings & Logging
- User settings (video options, directory, etc.) are stored in `user-settings.json` in Electron's userData directory.
- All backend logs and errors are written to `app.log` in the same directory for troubleshooting.

## For Developers
- Add new IPC handlers in `electron-main.js` and expose them in `preload.js` for backend/frontend communication.
- UI/UX changes are handled in `src/App.tsx`, `src/VideoReview.tsx`, and `src/App.css`.
- Timeline and event logic is in `VideoReview.tsx`.
- ffmpeg and League polling logic is in backend JS files.
- When adding new settings, always update the types in `src/types/electron-api.d.ts` and persist to `user-settings.json`.
- When adding new dialogs or permissions, use the modal pattern in `App.tsx` and check permissions via IPC.
- The app uses robust asar-unpacked logic to ensure ffmpeg works in production builds.

---

OBS is no longer used or supported. All code, UI, and settings related to OBS have been removed.
