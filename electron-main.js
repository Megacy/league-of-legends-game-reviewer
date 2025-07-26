// Main process for Electron
import { app, BrowserWindow, ipcMain, dialog, systemPreferences } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import EventRecorder from './eventRecorder.js';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import LeaguePoller from './leaguePoller.js';
import OBSController from './obsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Persistent User Settings Logic ---
// In development, use local workspace settings file for easier testing
const isDev = !app.isPackaged;
const settingsPath = isDev 
  ? path.join(process.cwd(), 'user-settings.json')
  : path.join(app.getPath('userData'), 'user-settings.json');
const logPath = path.join(app.getPath('userData'), 'app.log');

// Debug: Log the actual paths being used
console.log('[DEBUG] isDev:', isDev);
console.log('[DEBUG] userData path:', app.getPath('userData'));
console.log('[DEBUG] settingsPath:', settingsPath);
console.log('[DEBUG] Local workspace user-settings.json exists:', fs.existsSync('./user-settings.json'));

function logToFile(msg) {
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    // fallback to console if file write fails
    console.error('[LOG FILE ERROR]', e);
  }
}
function loadUserSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      console.log('[DEBUG] Loaded settings from:', settingsPath);
      console.log('[DEBUG] Settings recordingMode:', settings.recordingMode);
      return settings;
    }
  } catch (e) { logToFile('[SETTINGS LOAD ERROR] ' + e.message); }
  return {};
}
function saveUserSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) { logToFile('[SETTINGS SAVE ERROR] ' + e.message); }
}

const userSettings = loadUserSettings();

let autoRecordEnabled = true;

// --- Recordings Directory Logic ---
const isDevelopment = process.env.NODE_ENV === 'development';
let recordingsDirectory = userSettings.recordingsDirectory || path.join(app.getPath('documents'), 'Movlex-League-Recorder');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDevelopment, // Disable web security in development for local file access
    },
  });

  // Load the Vite dev server in development, or the built index.html in production
  if (isDevelopment) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function getTimestampBase() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

// --- FFmpeg Recording Logic ---
let ffmpegProcess = null;
let currentFileBase = null;
let eventRecorder = null;

// --- OBS Recording Logic ---
let obsController = null;
let obsRecordingActive = false;

function killFfmpegProcess() {
  if (typeof ffmpegProcess !== 'undefined' && ffmpegProcess) {
    try {
      ffmpegProcess.kill('SIGINT');
      ffmpegProcess = null;
      console.log('[FFMPEG CLEANUP] Killed ffmpeg process');
    } catch (e) {
      console.error('[FFMPEG CLEANUP ERROR]', e);
    }
  }
}

function sendRecordingState(isRecording) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(isRecording ? 'recording-started' : 'recording-stopped');
  });
}

// --- OBS Helper Functions ---
function getRecordingMode() {
  const settings = loadUserSettings();
  return settings.recordingMode || 'ffmpeg';
}

async function initializeOBS() {
  const settings = loadUserSettings();
  const obsAddress = settings.obsAddress || 'ws://127.0.0.1:4455';
  const obsPassword = settings.obsPassword || '';
  
  // If controller exists but settings changed, recreate it
  if (obsController && (obsController.address !== obsAddress || obsController.password !== obsPassword)) {
    await obsController.disconnect(); // Clean up old connection
    obsController = null;
  }
  
  if (!obsController) {
    obsController = new OBSController({ 
      address: obsAddress, 
      password: obsPassword 
    });
  }
  return obsController;
}

async function startRecording(settings = {}) {
  try {
    // Check if already recording
    if (ffmpegProcess || obsRecordingActive) {
      throw new Error('Recording already in progress');
    }
    
    currentFileBase = getTimestampBase();
    
    // Start event recording regardless of mode
    if (eventRecorder) await eventRecorder.stopRecording();
    eventRecorder = new EventRecorder({ outputDir: recordingsDirectory });
    await eventRecorder.startRecording(currentFileBase);
    console.log('[DEBUG] Event recorder started for:', currentFileBase);
    
    const recordingMode = settings.recordingMode || getRecordingMode();
    
    logToFile('[RECORDING] startRecording called with settings.recordingMode: ' + settings.recordingMode);
    logToFile('[RECORDING] getRecordingMode() returns: ' + getRecordingMode());
    logToFile('[RECORDING] Final recordingMode: ' + recordingMode);
    
    if (recordingMode === 'obs') {
      // OBS Mode
      try {
        await initializeOBS();
      } catch (err) {
        console.error('[OBS] Failed to initialize OBS controller:', err.message);
        throw new Error(`OBS connection failed: ${err.message}`);
      }
      
      // Set OBS filename format to match our timestamp format
      try {
        await obsController.setFilenameFormat(currentFileBase);
      } catch (err) {
        console.warn('[OBS] Could not set filename format:', err.message);
      }
      
      // Configure OBS to use our recordings directory and filename format
      try {
        await obsController.configureRecordingSettings(recordingsDirectory, currentFileBase);
        console.log('[OBS] Configured recording directory and filename format');
      } catch (err) {
        console.warn('[OBS] Could not configure recording settings:', err.message);
        // Don't throw error, just warn - recording can still work with OBS defaults
      }
      
      // Switch to the configured scene if specified
      if (settings.obsScene) {
        try {
          await obsController.setCurrentScene(settings.obsScene);
        } catch (err) {
          console.warn('[OBS] Could not switch scene:', err.message);
        }
      }
      
      try {
        await obsController.startRecording();
        obsRecordingActive = true;
        console.log('[OBS] Recording started');
        
        // Log the OBS commands executed
        console.log('[OBS COMMANDS EXECUTED]:');
        console.log('  1. connect() - Connect to OBS WebSocket');
        console.log(`  2. configureRecordingSettings("${recordingsDirectory}", "${currentFileBase}") - Set output directory and filename`);
        console.log('     - SetRecordDirectory() - Set recording output directory');  
        console.log('     - SetFilenameFormatting() - Set filename format');
        if (settings.obsScene) {
          console.log(`  3. setCurrentScene("${settings.obsScene}") - Switch to specified scene`);
        }
        console.log('  4. StartRecord() - Begin recording');
        console.log(`[OBS] Expected output file: ${path.join(recordingsDirectory, currentFileBase + '.mp4')}`);
      } catch (err) {
        console.error('[OBS] Failed to start recording:', err.message);
        throw new Error(`OBS recording failed: ${err.message}`);
      }
    } else {
      // FFmpeg Mode (existing logic)
      const outputPath = path.join(recordingsDirectory, `${currentFileBase}.mov`);
      // Settings from frontend
      let monitor = settings.selectedMonitor || settings.monitor;
      let resolution = settings.resolution;
      let framerate = settings.framerate;
      if (!monitor || !/^[0-9]+(:[0-9]+)?$/.test(monitor)) monitor = '1';
      if (!framerate || isNaN(framerate) || framerate < 10 || framerate > 60) framerate = 30;
      resolution = resolution || '1920x1080';
      const muteMic = settings.muteMic !== undefined ? settings.muteMic : true;
      const quality = settings.quality || 18;
      const preset = settings.preset || 'veryfast';
      
      // Always include system audio (device 0), add mic (device 1) if not muted
      let audioDevice = settings.audioDevice;
      let inputStr = `${monitor}:0`;
      if (typeof audioDevice === 'string' && audioDevice !== '') {
        inputStr = `${monitor}:${audioDevice}`;
      } else if (!muteMic) {
        inputStr += ',1';
      }
      // Use hardware encoder on Apple Silicon, else libx264
      let videoEncoder = 'libx264';
      let videoArgs = [];
      if (process.platform === 'darwin' && process.arch === 'arm64') {
        videoEncoder = 'h264_videotoolbox';
        // Use bitrate from settings if provided, else default to 10M
        videoArgs.push('-b:v', settings.bitrate || '10M');
      } else {
        videoArgs.push('-preset', preset, '-crf', String(quality));
        // Optionally allow bitrate override for x264 if set
        if (settings.bitrate) {
          videoArgs.push('-b:v', settings.bitrate);
        }
      }
      const args = [
        '-f', 'avfoundation',
        '-capture_cursor', '1',
        '-framerate', String(framerate),
        '-video_size', resolution,
        '-thread_queue_size', '8192',
        '-i', inputStr,
        '-async', '1',
        '-r', String(framerate),
        '-c:v', videoEncoder,
        ...videoArgs,
        '-c:a', 'aac',
        '-b:a', '128k',
        outputPath
      ];
      const fullCmd = [getFfmpegPath(), ...args].map(x => x.includes(' ') ? `"${x}"` : x).join(' ');
      console.log('[FFMPEG CMD]', fullCmd);
      process.stdout.write(`\n[FFMPEG CMD] ${fullCmd}\n`);
      ffmpegProcess = spawn(getFfmpegPath(), args);
      ffmpegProcess.stderr.on('data', (data) => {
        console.error('[FFMPEG ERROR]', data.toString());
      });
      ffmpegProcess.on('error', (err) => {
        console.error('[FFMPEG SPAWN ERROR]', err);
        ffmpegProcess = null;
        throw err;
      });
      ffmpegProcess.on('close', (code) => {
        console.log('[FFMPEG EXIT]', code);
        sendRecordingState(false);
      });
      console.log('[FFMPEG] Recording started');
    }
    
    sendRecordingState(true);
    return { ok: true, fileBase: currentFileBase };
  } catch (err) {
    console.error('[START RECORDING ERROR]', err);
    return { ok: false, error: err.message };
  }
}

async function stopRecording() {
  try {
    let stopped = false;
    
    // Stop FFmpeg recording if active
    if (ffmpegProcess) {
      ffmpegProcess.kill('SIGINT');
      ffmpegProcess = null;
      console.log('[FFMPEG STOP] Killed ffmpeg process');
      stopped = true;
    }
    
    // Stop OBS recording if active
    if (obsRecordingActive && obsController) {
      try {
        await obsController.stopRecording();
        obsRecordingActive = false;
        console.log('[OBS STOP] Stopped OBS recording');
        stopped = true;
      } catch (err) {
        console.error('[OBS STOP ERROR]', err);
        // Still consider it stopped to prevent stuck state
        obsRecordingActive = false;
        stopped = true;
      }
    }
    
    if (stopped) {
      sendRecordingState(false);
      // Emit load-latest-recording event after recording stops
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('load-latest-recording');
      });
    }
    
    // Stop event recording
    if (eventRecorder) {
      console.log('[DEBUG] Stopping event recorder...');
      await eventRecorder.stopRecording();
      eventRecorder = null;
    }
    
    return { ok: true };
  } catch (err) {
    console.error('[STOP RECORDING ERROR]', err);
    return { ok: false, error: err.message };
  }
}

ipcMain.handle('open-system-permissions', async (_event, type) => {
  // type: 'screen' | 'mic' | undefined
  const { shell } = require('electron');
  let url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
  if (type === 'mic') {
    url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
  }
  logToFile(`[PERMISSIONS] Opening System Preferences: ${url}`);
  shell.openExternal(url);
  return { ok: true };
});

// Patch ffmpegPath for asar-unpacked in production (robust for any subpath)
function getFfmpegPath() {
  let realPath = ffmpegPath;
  // If running in production and path includes 'app.asar', rewrite to 'app.asar.unpacked' for any subpath
  if (realPath.includes('app.asar')) {
    realPath = realPath.replace(/app\.asar(?![\w.])/g, 'app.asar.unpacked');
  }
  return realPath;
}

// IPC handler to check screen recording permission (macOS only)
ipcMain.handle('has-screen-permission', async () => {
  if (process.platform !== 'darwin') return true;
  try {
    // Electron 14+ systemPreferences.getMediaAccessStatus('screen')
    const status = systemPreferences.getMediaAccessStatus('screen');
    return status === 'granted';
  } catch (e) {
    logToFile('[PERMISSIONS] Error checking screen permission: ' + e.message);
    return false;
  }
});

// IPC handler to list avfoundation devices (video and audio)
ipcMain.handle('list-avfoundation-devices', async () => {
  return new Promise((resolve) => {
    try {
      logToFile('[DEVICES] Spawning ffmpeg at ' + getFfmpegPath());
      const ffmpegList = spawn(getFfmpegPath(), ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
      let output = '';
      ffmpegList.stderr.on('data', (data) => {
        output += data.toString();
      });
      ffmpegList.on('close', (code) => {
        logToFile(`[DEVICES] ffmpeg exited with code ${code}`);
        // Parse devices from ffmpeg output
        const devices = [];
        const lines = output.split('\n');
        let currentType = '';
        for (const line of lines) {
          if (line.includes('AVFoundation video devices')) currentType = 'video';
          if (line.includes('AVFoundation audio devices')) currentType = 'audio';
          const match = line.match(/\[(\d+)\] (.+)$/);
          if (match && currentType) {
            devices.push({ type: currentType, index: match[1], name: match[2] });
          }
        }
        resolve(devices);
      });
    } catch (e) {
      logToFile('[DEVICES] Exception: ' + e.message);
      resolve([]);
    }
  });
});

ipcMain.handle('start-recording', async (_event, settings = {}) => {
  return await startRecording(settings);
});

// --- FFmpeg availability check ---
let ffmpegAvailable = false;
try {
  execSync(`${getFfmpegPath()} -version`, { stdio: 'ignore' });
  ffmpegAvailable = true;
} catch (e) {
  ffmpegAvailable = false;
}
ipcMain.handle('is-ffmpeg-available', () => ffmpegAvailable);

// IPC handler to get FFmpeg command for debugging
ipcMain.handle('getFfmpegCommand', async (_event, settings = {}) => {
  try {
    // Settings from frontend
    let monitor = settings.selectedMonitor || settings.monitor;
    let resolution = settings.resolution;
    let framerate = settings.framerate;
    if (!monitor || !/^[0-9]+(:[0-9]+)?$/.test(monitor)) monitor = '1';
    if (!framerate || isNaN(framerate) || framerate < 10 || framerate > 60) framerate = 30;
    resolution = resolution || '1920x1080';
    const muteMic = settings.muteMic !== undefined ? settings.muteMic : true;
    const quality = settings.quality || 18;
    const preset = settings.preset || 'veryfast';
    
    // Always include system audio (device 0), add mic (device 1) if not muted
    let audioDevice = settings.audioDevice;
    let inputStr = `${monitor}:0`;
    if (typeof audioDevice === 'string' && audioDevice !== '') {
      inputStr = `${monitor}:${audioDevice}`;
    } else if (!muteMic) {
      inputStr += ',1';
    }
    
    // Use hardware encoder on Apple Silicon, else libx264
    let videoEncoder = 'libx264';
    let videoArgs = [];
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      videoEncoder = 'h264_videotoolbox';
      // Use bitrate from settings if provided, else default to 10M
      videoArgs.push('-b:v', settings.bitrate || '10M');
    } else {
      videoArgs.push('-preset', preset, '-crf', String(quality));
      // Optionally allow bitrate override for x264 if set
      if (settings.bitrate) {
        videoArgs.push('-b:v', settings.bitrate);
      }
    }
    
    const args = [
      '-f', 'avfoundation',
      '-capture_cursor', '1',
      '-framerate', String(framerate),
      '-video_size', resolution,
      '-thread_queue_size', '8192',
      '-i', inputStr,
      '-async', '1',
      '-r', String(framerate),
      '-c:v', videoEncoder,
      ...videoArgs,
      '-c:a', 'aac',
      '-b:a', '128k',
      '[OUTPUT_FILE]'
    ];
    
    const fullCmd = [getFfmpegPath(), ...args].map(x => x.includes(' ') ? `"${x}"` : x).join(' ');
    return fullCmd;
  } catch (err) {
    logToFile('[GET FFMPEG CMD ERROR] ' + err.message);
    return `Error generating command: ${err.message}`;
  }
});

// New IPC handler to return the absolute path to a recording file
ipcMain.handle('get-recording-file-path', (event, fileBase) => {
  // Always return the absolute path to the .mov file in the recordings directory
  return path.join(recordingsDirectory, `${fileBase}.mov`);
});

// New IPC handler to get video URL that works in both dev and production
ipcMain.handle('get-video-url', (event, fileBase) => {
  let filePath;
  
  // Check if fileBase is already a full path (contains path separators)
  if (fileBase.includes('/') || fileBase.includes('\\')) {
    filePath = fileBase;
  } else {
    // Assume it's a fileBase in the recordings directory
    filePath = path.join(recordingsDirectory, `${fileBase}.mov`);
  }
  
  if (isDevelopment) {
    // In development, return the absolute file path - webSecurity is disabled
    return `file://${filePath}`;
  } else {
    // In production, use the same approach but ensure proper encoding
    return `file://${encodeURI(filePath)}`;
  }
});

// New IPC handler to get video URL for external files (files outside recordings directory)
ipcMain.handle('get-external-video-url', (event, filePath) => {
  if (isDevelopment) {
    // In development, return the absolute file path - webSecurity is disabled
    return `file://${filePath}`;
  } else {
    // In production, use the same approach but ensure proper encoding
    return `file://${encodeURI(filePath)}`;
  }
});

// When user changes recordings directory, update and save to settings
ipcMain.handle('set-obs-recording-path', async (event, dirPath) => {
  try {
    recordingsDirectory = dirPath;
    userSettings.recordingsDirectory = dirPath;
    saveUserSettings(userSettings);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Get the latest recording file base (without extension)
ipcMain.handle('get-latest-recording', async () => {
  try {
    const files = fs.readdirSync(recordingsDirectory)
      .filter(f => f.endsWith('.mov'))
      .sort()
      .reverse();
    if (files.length > 0) {
      // Remove .mov extension for fileBase
      return files[0].replace(/\.mov$/, '');
    }
    return null;
  } catch (e) {
    return null;
  }
});

// Select a new recordings directory
ipcMain.handle('select-recordings-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    recordingsDirectory = result.filePaths[0];
    userSettings.recordingsDirectory = recordingsDirectory;
    saveUserSettings(userSettings);
    return { ok: true, directory: recordingsDirectory };
  }
  return { ok: false, directory: recordingsDirectory };
});

// Select a video file to load
ipcMain.handle('select-video-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mov', 'mp4', 'avi', 'mkv', 'webm'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return { ok: true, filePath: result.filePaths[0] };
  }
  return { ok: false, filePath: null };
});

// Get the current recordings directory
ipcMain.handle('get-recordings-directory', async () => {
  return recordingsDirectory;
});

// Get current player info from League Live Client Data API
ipcMain.handle('get-league-player-info', async () => {
  try {
    const https = await import('https');
    const fetch = (await import('node-fetch')).default;
    
    // Get active player info
    const response = await fetch('https://127.0.0.1:2999/liveclientdata/activeplayername', {
      agent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 3000
    });
    
    if (response.ok) {
      const playerName = await response.text();
      // Clean up the response - remove quotes and hashtag portion
      const cleanPlayerName = playerName.replace(/"/g, '').split('#')[0];
      logToFile(`[LeagueAPI] Active player name: ${cleanPlayerName}`);
      return { ok: true, playerName: cleanPlayerName };
    } else {
      // Try alternative endpoint for all game data
      const allDataResponse = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
        agent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 3000
      });
      
      if (allDataResponse.ok) {
        const gameData = await allDataResponse.json();
        // Find the active player in the list
        const activePlayer = gameData.allPlayers?.find(player => player.summonerName && !player.isBot);
        if (activePlayer) {
          const cleanPlayerName = activePlayer.summonerName.split('#')[0];
          logToFile(`[LeagueAPI] Found active player from allgamedata: ${cleanPlayerName}`);
          return { ok: true, playerName: cleanPlayerName };
        }
      }
      
      logToFile(`[LeagueAPI] Failed to get player info - League client not running or not in game`);
      return { ok: false, error: 'League client not running or not in game' };
    }
  } catch (error) {
    logToFile(`[LeagueAPI] Error getting player info: ${error.message}`);
    return { ok: false, error: error.message };
  }
});

// Add IPC handler for 'get-events-for-video' to load the events JSON for a given video file base.
ipcMain.handle('get-events-for-video', async (_event, fileBase) => {
  try {
    logToFile(`[EVENTS] Attempting to load events for fileBase: ${fileBase}`);
    
    // Handle both fileBase and full path cases
    let eventsPath;
    if (fileBase.includes('/') || fileBase.includes('\\')) {
      // If it's a full path, try to find corresponding events file
      const dir = path.dirname(fileBase);
      const fileName = path.basename(fileBase, path.extname(fileBase));
      eventsPath = path.join(dir, `${fileName}.events.json`);
    } else {
      // Standard fileBase in recordings directory
      eventsPath = path.join(recordingsDirectory, `${fileBase}.events.json`);
    }
    
    logToFile(`[EVENTS] Looking for events file at: ${eventsPath}`);
    
    if (fs.existsSync(eventsPath)) {
      const data = fs.readFileSync(eventsPath, 'utf-8');
      const parsedData = JSON.parse(data);
      
      // Handle new format with metadata or old format (array)
      let events, activePlayerName = null;
      if (Array.isArray(parsedData)) {
        // Old format - just an array of events
        events = parsedData;
        logToFile(`[EVENTS] Found ${events.length} events (old format)`);
      } else if (parsedData.events && Array.isArray(parsedData.events)) {
        // New format with metadata
        events = parsedData.events;
        activePlayerName = parsedData.metadata?.activePlayerName;
        logToFile(`[EVENTS] Found ${events.length} events (new format) with player: ${activePlayerName}`);
      } else {
        logToFile(`[EVENTS] Invalid events file format`);
        return { events: [], activePlayerName: null };
      }
      
      return { events, activePlayerName };
    } else {
      logToFile(`[EVENTS] No events file found`);
      return { events: [], activePlayerName: null };
    }
  } catch (e) {
    logToFile(`[EVENTS] Error loading events: ${e.message}`);
    return { events: [], activePlayerName: null };
  }
});

// Get video settings
ipcMain.handle('get-video-settings', async () => {
  // Return video settings from userSettings, fallback to defaults
  return {
    monitor: userSettings.videoSettings?.monitor || userSettings.videoSettings?.selectedMonitor || '1',
    selectedMonitor: userSettings.videoSettings?.selectedMonitor || userSettings.videoSettings?.monitor || '1',
    resolution: userSettings.videoSettings?.resolution || '1920x1080',
    framerate: userSettings.videoSettings?.framerate || 30,
    muteMic: userSettings.videoSettings && 'muteMic' in userSettings.videoSettings ? userSettings.videoSettings.muteMic : true,
    quality: userSettings.videoSettings?.quality || 18,
    preset: userSettings.videoSettings?.preset || 'veryfast',
    audioDevice: userSettings.videoSettings?.audioDevice || '',
    bitrate: userSettings.videoSettings?.bitrate || '',
    // OBS settings
    recordingMode: userSettings.recordingMode || 'ffmpeg',
    obsAddress: userSettings.obsAddress || 'ws://127.0.0.1:4455',
    obsPassword: userSettings.obsPassword || '',
    obsScene: userSettings.obsScene || '',
  };
});

// Get timeline settings (visible event types)
ipcMain.handle('get-timeline-settings', async () => {
  return {
    visibleEventTypes: userSettings.timelineSettings?.visibleEventTypes || [
      'ChampionKill', 'TurretKilled', 'DragonKill', 'BaronKill', 'FirstBlood', 
      'Ace', 'InhibKilled', 'HeraldKill', 'Multikill'
    ]
  };
});

// Set timeline settings (visible event types)
ipcMain.handle('set-timeline-settings', async (_event, settings) => {
  userSettings.timelineSettings = { ...userSettings.timelineSettings, ...settings };
  saveUserSettings(userSettings);
  logToFile('[SETTINGS] Timeline settings saved: ' + JSON.stringify(settings));
  return { ok: true };
});

// Set video settings
ipcMain.handle('set-video-settings', async (_event, settings) => {
  // Always persist both monitor and selectedMonitor for compatibility
  if (settings.selectedMonitor) {
    settings.monitor = settings.selectedMonitor;
  } else if (settings.monitor) {
    settings.selectedMonitor = settings.monitor;
  }
  
  // Handle OBS-specific settings at the root level
  if (settings.recordingMode !== undefined) {
    userSettings.recordingMode = settings.recordingMode;
  }
  if (settings.obsAddress !== undefined) {
    userSettings.obsAddress = settings.obsAddress;
  }
  if (settings.obsPassword !== undefined) {
    userSettings.obsPassword = settings.obsPassword;
  }
  if (settings.obsScene !== undefined) {
    userSettings.obsScene = settings.obsScene;
  }
  
  // Update video settings (excluding OBS settings to avoid duplication)
  const { recordingMode, obsAddress, obsPassword, obsScene, ...videoSettings } = settings;
  userSettings.videoSettings = { ...userSettings.videoSettings, ...videoSettings };
  
  saveUserSettings(userSettings);
  return { ok: true };
});

// Get recording mode
ipcMain.handle('get-recording-mode', async () => {
  return getRecordingMode();
});

// Set recording mode
ipcMain.handle('set-recording-mode', async (_event, mode) => {
  userSettings.recordingMode = mode;
  saveUserSettings(userSettings);
  return { ok: true };
});

// Test OBS connection
ipcMain.handle('test-obs-connection', async (_event, address, password) => {
  try {
    const testAddress = address || 'ws://127.0.0.1:4455';
    const testPassword = password || '';
    
    // Use the global obsController if settings match, otherwise create a temporary one
    const currentObs = await initializeOBS();
    if (currentObs && currentObs.address === testAddress && currentObs.password === testPassword) {
      // Test the existing connection
      const result = await currentObs.testConnection();
      return { ok: result.connected, error: result.error };
    } else {
      // Test with temporary controller for different settings
      const testOBS = new OBSController({ 
        address: testAddress, 
        password: testPassword 
      });
      const result = await testOBS.testConnection();
      await testOBS.disconnect(); // Clean up
      return { ok: result.connected, error: result.error };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Get OBS connection status
ipcMain.handle('get-obs-connection-status', async () => {
  try {
    if (!obsController) {
      return { connected: false };
    }
    
    // Use the improved testConnection method
    const result = await obsController.testConnection();
    
    if (result.connected) {
      // Check if currently recording
      try {
        const status = await obsController.obs.call('GetRecordStatus');
        return { 
          connected: true, 
          recording: status.outputActive || false 
        };
      } catch (err) {
        return { connected: true, recording: false };
      }
    } else {
      return { connected: false };
    }
  } catch (err) {
    return { connected: false };
  }
});

// Get OBS recording settings for debugging
ipcMain.handle('get-obs-recording-settings', async () => {
  try {
    if (!obsController) {
      return { ok: false, error: 'OBS not initialized' };
    }
    
    const settings = await obsController.getRecordingSettings();
    return { ok: true, settings };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// --- Clip Export Logic ---
ipcMain.handle('export-clip', async (_event, params) => {
  try {
    const { fileBase, start, end, outName } = params;
    if (!fileBase || start == null || end == null) {
      throw new Error('Missing required parameters');
    }
    const inputPath = path.join(recordingsDirectory, `${fileBase}.mov`);
    const clipsDir = path.join(recordingsDirectory, 'clips');
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });
    const outFile = outName || `${fileBase}_clip_${start}-${end}.mov`;
    const outPath = path.join(clipsDir, outFile);
    return await new Promise((resolve, reject) => {
      const args = [
        '-ss', String(start),
        '-to', String(end),
        '-i', inputPath,
        '-c', 'copy',
        outPath
      ];
      logToFile('[FFMPEG CLIP CMD] ' + getFfmpegPath() + ' ' + args.join(' '));
      const proc = spawn(getFfmpegPath(), args);
      let stderr = '';
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        logToFile(`[FFMPEG CLIP] exited with code ${code}, stderr: ${stderr}`);
        if (code === 0 && fs.existsSync(outPath)) {
          resolve({ ok: true, outPath });
        } else {
          logToFile('[FFMPEG CLIP ERROR] ' + (stderr || 'Clip export failed'));
          reject(new Error(stderr || 'Clip export failed'));
        }
      });
      proc.on('error', (err) => {
        logToFile('[FFMPEG CLIP SPAWN ERROR] ' + err);
        reject(err);
      });
    });
  } catch (err) {
    logToFile('[EXPORT CLIP ERROR] ' + err.message);
    return { ok: false, error: err.message };
  }
});

// --- Add stop-recording handler ---
ipcMain.handle('stop-recording', async () => {
  return await stopRecording();
});

// Add IPC handler to set autoRecordEnabled from frontend
ipcMain.handle('set-auto-record', async (_event, enabled) => {
  autoRecordEnabled = enabled;
  userSettings.autoRecordEnabled = enabled;
  saveUserSettings(userSettings);
  logToFile('[SETTINGS] Auto-record set to: ' + enabled);
  return true;
});

// Add IPC handler to get autoRecordEnabled value from backend
ipcMain.handle('get-auto-record', async () => {
  return autoRecordEnabled;
});

// --- Auto-Updater IPC Handlers ---
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    logToFile('[AutoUpdater] Skipping update check in development mode');
    return { available: false, message: 'Updates disabled in development' };
  }
  
  try {
    const result = await autoUpdater.checkForUpdates();
    logToFile('[AutoUpdater] Check for updates result: ' + JSON.stringify(result));
    return { available: !!result, updateInfo: result?.updateInfo };
  } catch (error) {
    logToFile('[AutoUpdater] Check for updates error: ' + error.message);
    return { available: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  if (isDev) {
    logToFile('[AutoUpdater] Skipping update install in development mode');
    return false;
  }
  
  try {
    autoUpdater.quitAndInstall();
    return true;
  } catch (error) {
    logToFile('[AutoUpdater] Install update error: ' + error.message);
    return false;
  }
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

let leaguePoller = null;

// --- Auto Updater Configuration ---
function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.checkForUpdatesAndNotify();
  
  // Log auto-updater events
  autoUpdater.on('checking-for-update', () => {
    logToFile('[AutoUpdater] Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    logToFile('[AutoUpdater] Update available: ' + info.version);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    logToFile('[AutoUpdater] Update not available: ' + info.version);
  });
  
  autoUpdater.on('error', (err) => {
    logToFile('[AutoUpdater] Error: ' + err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = '[AutoUpdater] Download speed: ' + progressObj.bytesPerSecond;
    logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%';
    logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    logToFile(logMessage);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    logToFile('[AutoUpdater] Update downloaded: ' + info.version);
    // Show notification to user about available update
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize auto-updater (only in production)
  if (!isDev) {
    setupAutoUpdater();
  }
  
  // Start LeaguePoller for auto-recording
  leaguePoller = new LeaguePoller({
    pollInterval: 2000,
    onGameStart: async () => {
      logToFile('[LeaguePoller] Game detected. Auto-record check: ' + autoRecordEnabled);
      if (autoRecordEnabled) {
        // Get full user settings, preserving recordingMode at root level
        const settings = {
          ...userSettings.videoSettings,
          ...userSettings,
          // Ensure recordingMode from root level is preserved
          recordingMode: userSettings.recordingMode || 'ffmpeg'
        };
        logToFile('[LeaguePoller] Starting auto-recording with mode: ' + settings.recordingMode);
        logToFile('[LeaguePoller] Full settings: ' + JSON.stringify(settings));
        await startRecording(settings);
      }
    },
    onGameEnd: async () => {
      logToFile('[LeaguePoller] Game ended. Auto-record check: ' + autoRecordEnabled);
      if (autoRecordEnabled) {
        // Add a small delay to allow event recorder to collect final events
        logToFile('[LeaguePoller] Waiting 3 seconds before stopping recording to collect final events...');
        setTimeout(async () => {
          await stopRecording();
        }, 3000); // 3 second delay
      }
    },
    debug: false
  });
  leaguePoller.start();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  // Cleanup: kill ffmpeg process if still running
  killFfmpegProcess();
});
