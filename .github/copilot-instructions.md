<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

<!--
League of Legends Game Reviewer Desktop App

**App Structure Overview (2025, ffmpeg version):**

- **Electron Main Process (`electron-main.js`)**
  - Handles app lifecycle, window creation, and IPC.
  - Uses bundled ffmpeg (not OBS) for screen recording via avfoundation, with robust asar-unpacked path logic for production.
  - Polls League Live Client Data API for in-game status (see `leaguePoller.js`).
  - Starts/stops event recording (see `eventRecorder.js`).
  - Exposes IPC handlers for frontend to control recording, get/set events, fetch latest recordings, list avfoundation devices, check/set permissions, etc.
  - Always saves an `.events.json` file for every recording, even if empty.
  - Handles persistent user settings (`user-settings.json`) and logging (`app.log`).
  - Handles macOS permissions (screen/mic) and exposes permission status via IPC.

- **Preload Script (`preload.js`)**
  - Exposes a secure API (`window.electronAPI`) to the renderer for all IPC calls.
  - Methods: start/stop recording, set auto record, get/set events, get/set recordings directory, get latest recording, listen for new recordings, export clip, check ffmpeg, list avfoundation devices, check/set permissions, etc.

- **Frontend (React, Vite, TypeScript)**
  - **`src/App.tsx`**: Main React component. Handles global state, header UI, file selection, and passes props to `VideoReview`.
    - Listens for new recordings via `window.electronAPI.onLoadLatestRecording`.
    - Handles file selection via folder icon (no file input visible).
    - Shows error/success toasts and permission/ffmpeg warnings.
    - Video settings dialog allows device selection (uses avfoundation, not OBS).
    - Modal dialog for permissions appears on startup if needed, with "do not show again" option (persisted in localStorage).
  - **`src/VideoReview.tsx`**: Main review UI. Loads and displays video, timeline, and event tags.
    - Loads events for the selected/auto-loaded recording.
    - Timeline UI for jumping to events, with event icons.
    - Clip creation: select a region, preview it, and export as a video clip (ffmpeg required).
  - **CSS (`src/App.css`)**: Modern, responsive layout. Header, large video, timeline, dialogs, and toasts.

- **Backend Modules**
  - **`leaguePoller.js`**: Polls League API for in-game status, triggers recording/events.
  - **`eventRecorder.js`**: Records and saves in-game events to JSON (always writes a file, even if empty).

**Types**
- Shared types in `src/types/electron-api.d.ts`.
- `EventData` is the canonical event type for all event objects.
- `VideoSettings` is used for all persisted video settings.

**How to Edit/Extend:**
- Add new IPC handlers in `electron-main.js` and expose them in `preload.js` for backend/frontend communication.
- Always update types in `src/types/electron-api.d.ts` when adding new settings or IPC.
- UI/UX changes are handled in `src/App.tsx`, `src/VideoReview.tsx`, and `src/App.css`.
- Timeline and event logic is in `VideoReview.tsx`.
- ffmpeg and League polling logic is in backend JS files.
- When adding new dialogs or permissions, use the modal pattern in `App.tsx` and check permissions via IPC.
- All persistent settings are stored in `user-settings.json` and should be updated in sync with UI and types.
- All backend logs and errors are written to `app.log` in the user data directory.
- The app uses robust asar-unpacked logic to ensure ffmpeg works in production builds.

**Current UI/UX:**
- Header: left-aligned title, right-aligned folder/settings icons.
- Video: large, centered, immersive.
- Timeline: horizontal, event icons, filterable, with current time indicator.
- File selection: via folder icon only.
- Auto-loads latest recording on app start and after game ends.
- Clip creation and preview at the top of the review UI.
- Error and success toasts, persistent permission/ffmpeg warning if missing.
- Modal dialog for permissions appears on startup if needed, with "do not show again" option.

**VS Code Tasks:**
- `dev`: Runs `npm run dev` (development build and hot reload)
- `build:prod`: Runs `npm run build:prod` (production build and packaging)

**Release Process (Automated):**
- **Simple Release**: Use `npm run release` for patch releases (most common)
- **Version Types**: `npm run release:minor` (features), `npm run release:major` (breaking changes)
- **How it works**: 
  - Local script (`simple-release.sh`) handles version bump, commit, and tag push
  - GitHub Actions (`.github/workflows/release.yml`) automatically builds and releases
  - Ensures `latest-mac.yml` is always included for auto-updater functionality
- **Never manually run** `electron-builder --publish` or similar - causes conflicts
- **Monitor progress**: Check GitHub Actions at https://github.com/Megacy/league-of-legends-game-reviewer/actions

**Auto-Updater:**
- Configured in `electron-main.js` with GitHub releases
- Requires `latest-mac.yml` file in releases (handled automatically by GitHub Actions)
- Users on older versions will auto-update when new releases are published

**For future edits:**
- See this file for structure. Update here if you add major new modules, types, or flows.
- Always update user settings, types, and IPC in sync.
- OBS is no longer used or supported. All code, UI, and settings related to OBS have been removed.
-->
