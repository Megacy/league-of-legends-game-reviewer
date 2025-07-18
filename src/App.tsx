import { useState, useEffect } from 'react';
import VideoReview from './VideoReview';
import './App.css';

function App() {
  const [bitrate, setBitrate] = useState('10M');
  const [autoRecord, setAutoRecord] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [avfoundationDevices, setAvfoundationDevices] = useState<{ value: string, label: string }[]>([]);
  const [audioDevices, setAudioDevices] = useState<{ value: string, label: string }[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedMonitor, setSelectedMonitor] = useState('1');
  const [resolution, setResolution] = useState('1920x1080');
  const [muteMic, setMuteMic] = useState(false);
  const [framerate, setFramerate] = useState(30);
  const [quality, setQuality] = useState(18);
  const [preset, setPreset] = useState('superfast');
  const [currentFilename, setCurrentFilename] = useState('');
  const [latestFile, setLatestFile] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [recordingsDirectory, setRecordingsDirectory] = useState<string>('');
  
  // OBS Mode state
  const [recordingMode, setRecordingMode] = useState<'ffmpeg' | 'obs'>('ffmpeg');
  const [obsAddress, setObsAddress] = useState('ws://127.0.0.1:4455');
  const [obsPassword, setObsPassword] = useState('');
  const [obsScene, setObsScene] = useState('');
  const [obsConnectionStatus, setObsConnectionStatus] = useState<{ connected: boolean; recording?: boolean }>({ connected: false });
  const [obsTestResult, setObsTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Listen for recording-started and recording-stopped events from backend
  useEffect(() => {
    if (window.electronAPI?.onRecordingStarted) {
      const handler = () => setIsRecording(true);
      window.electronAPI.onRecordingStarted(handler);
    }
    if (window.electronAPI?.onRecordingStopped) {
      const handler = () => setIsRecording(false);
      window.electronAPI.onRecordingStopped(handler);
    }
    // No cleanup needed for this app (listeners are idempotent)
  }, []);
  // Load persisted video settings from backend on mount
  useEffect(() => {
    (async () => {
      if (window.electronAPI?.getVideoSettings) {
        try {
          const settings = await window.electronAPI.getVideoSettings();
          if (settings) {
            if (settings.selectedMonitor) setSelectedMonitor(settings.selectedMonitor);
            if (settings.resolution) setResolution(settings.resolution);
            if (typeof settings.muteMic === 'boolean') setMuteMic(settings.muteMic);
            if (settings.framerate) setFramerate(settings.framerate);
            if (settings.quality) setQuality(settings.quality);
            if (settings.preset) setPreset(settings.preset);
            if (settings.audioDevice) setSelectedAudioDevice(settings.audioDevice);
            if (settings.bitrate) setBitrate(settings.bitrate);
            // OBS settings
            if (settings.recordingMode) setRecordingMode(settings.recordingMode);
            if (settings.obsAddress) setObsAddress(settings.obsAddress);
            if (settings.obsPassword) setObsPassword(settings.obsPassword);
            if (settings.obsScene) setObsScene(settings.obsScene);
          }
        } catch (e) {
          // ignore
        }
      }
    })();
  }, []);

  // Fetch latest recording and current recordings directory on mount
  useEffect(() => {
    (async () => {
      if (window.electronAPI?.getLatestRecording && window.electronAPI?.getRecordingsDirectory) {
        const file = await window.electronAPI.getLatestRecording();
        const dir = await window.electronAPI.getRecordingsDirectory();
        if (file) {
          setLatestFile(file);
          setCurrentFilename(file);
        }
        setRecordingsDirectory(dir);
      }
    })();
  }, []);

  // Listen for load-latest-recording event from main process
  useEffect(() => {
    if (window.electronAPI?.onLoadLatestRecording) {
      const handler = async () => {
        if (window.electronAPI?.getLatestRecording) {
          const file = await window.electronAPI.getLatestRecording();
          if (file) {
            setLatestFile(file);
            setCurrentFilename(file);
          }
        }
      };
      window.electronAPI.onLoadLatestRecording(handler);
      return () => {
        // Remove listener if needed (not strictly necessary for this app)
      };
    }
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Handlers
  const handleAutoRecordChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoRecord(e.target.checked);
    if (window.electronAPI?.setAutoRecord) {
      await window.electronAPI.setAutoRecord(e.target.checked);
    }
  };

  const handleManualStart = async () => {
    if (window.electronAPI?.startRecording) {
      try {
        const settings = {
          selectedMonitor,
          resolution,
          muteMic,
          framerate,
          quality,
          preset,
          audioDevice: selectedAudioDevice,
          bitrate,
          recordingMode,
          obsAddress,
          obsPassword,
          obsScene,
        };
        const result = await window.electronAPI.startRecording(settings);
        if (result?.ok) {
          setIsRecording(true);
        } else {
          const errorMsg = result?.error || 'Failed to start recording';
          alert(`Recording failed: ${errorMsg}`);
        }
      } catch (err) {
        alert(`Recording failed: ${err}`);
      }
    }
  };

  const handleManualStop = async () => {
    if (window.electronAPI?.stopRecording) {
      try {
        const result = await window.electronAPI.stopRecording();
        if (result?.ok) {
          setIsRecording(false);
        } else {
          const errorMsg = result?.error || 'Failed to stop recording';
          alert(`Stop recording failed: ${errorMsg}`);
        }
      } catch (err) {
        alert(`Stop recording failed: ${err}`);
      }
    }
  };

  const handleSetDirectory = async () => {
    if (window.electronAPI?.selectRecordingsDirectory) {
      const result = await window.electronAPI.selectRecordingsDirectory();
      if (result.ok) setRecordingsDirectory(result.directory);
    }
  };

  const handleFileInput = async () => {
    if (window.electronAPI?.selectVideoFile) {
      const result = await window.electronAPI.selectVideoFile();
      if (result.ok && result.filePath) {
        const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath;
        setCurrentFilename(fileName);
        setLatestFile(result.filePath);
      }
    }
  };

  const closeAllDialogs = () => {
    setShowSettings(false);
    setShowVideoSettings(false);
  };

  // Fetch devices when opening video settings
  useEffect(() => {
    if (showVideoSettings && window.electronAPI?.listAvfoundationDevices) {
      window.electronAPI.listAvfoundationDevices().then((devices: Array<{ type: string; index: string; name: string }>) => {
        const videoDevices = devices.filter((d: { type: string }) => d.type === 'video').map((d: { index: string; name: string }) => ({ value: d.index, label: `[${d.index}] ${d.name}` }));
        const audioDevices = devices.filter((d: { type: string }) => d.type === 'audio').map((d: { index: string; name: string }) => ({ value: d.index, label: `[${d.index}] ${d.name}` }));
        setAvfoundationDevices(videoDevices.length ? videoDevices : [{ value: '1', label: 'Screen 1' }]);
        setAudioDevices(audioDevices);
        // If selectedMonitor is not in the list, set to first available
        if (videoDevices.length && !videoDevices.some((d: { value: string }) => d.value === selectedMonitor)) {
          setSelectedMonitor(videoDevices[0].value);
        }
        // If selectedAudioDevice is not in the list, set to first available
        if (audioDevices.length && !audioDevices.some((d: { value: string }) => d.value === selectedAudioDevice)) {
          setSelectedAudioDevice(audioDevices[0].value);
        }
      });
    }
    // When opening, also reload settings from backend to ensure up-to-date
    if (showVideoSettings && window.electronAPI?.getVideoSettings) {
      window.electronAPI.getVideoSettings().then(settings => {
        if (settings) {
          if (settings.selectedMonitor) setSelectedMonitor(settings.selectedMonitor);
          if (settings.resolution) setResolution(settings.resolution);
          if (typeof settings.muteMic === 'boolean') setMuteMic(settings.muteMic);
          if (settings.framerate) setFramerate(settings.framerate);
          if (settings.quality) setQuality(settings.quality);
          if (settings.preset) setPreset(settings.preset);
        }
      });
    }
  }, [showVideoSettings]);

  // Test OBS connection when address or password changes
  const testObsConnection = async () => {
    if (window.electronAPI?.testObsConnection) {
      setObsTestResult({ status: 'testing' });
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        );
        
        const testPromise = window.electronAPI.testObsConnection(obsAddress, obsPassword);
        const result = await Promise.race([testPromise, timeoutPromise]) as { ok: boolean; error?: string };
        
        if (result.ok) {
          setObsConnectionStatus({ connected: true });
          setObsTestResult({ status: 'success', message: 'Connected successfully' });
          return true;
        } else {
          setObsConnectionStatus({ connected: false });
          setObsTestResult({ status: 'error', message: result.error || 'Connection failed' });
          return false;
        }
      } catch (err: unknown) {
        setObsConnectionStatus({ connected: false });
        const errorMessage = (err as Error)?.message === 'Connection timeout' ? 'Connection timeout (10s)' : 'Connection failed';
        setObsTestResult({ status: 'error', message: errorMessage });
        return false;
      }
    }
    return false;
  };

  // Check OBS connection status periodically when in OBS mode
  useEffect(() => {
    if (recordingMode === 'obs') {
      const checkStatus = async () => {
        if (window.electronAPI?.getObsConnectionStatus) {
          const status = await window.electronAPI.getObsConnectionStatus();
          setObsConnectionStatus(status);
        }
      };
      
      // Check initially
      checkStatus();
      
      // Check every 5 seconds
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [recordingMode]);

  // Reset test result when OBS settings change
  useEffect(() => {
    setObsTestResult({ status: 'idle' });
  }, [obsAddress, obsPassword]);

  // Save settings helper function
  const saveVideoSettings = async (newSettings: Partial<{
    selectedMonitor: string;
    resolution: string;
    muteMic: boolean;
    framerate: number;
    quality: number;
    preset: string;
    audioDevice: string;
    bitrate: string;
    recordingMode: 'ffmpeg' | 'obs';
    obsAddress: string;
    obsPassword: string;
    obsScene: string;
  }>) => {
    if (window.electronAPI?.setVideoSettings) {
      await window.electronAPI.setVideoSettings({
        selectedMonitor,
        resolution,
        muteMic,
        framerate,
        quality,
        preset,
        audioDevice: selectedAudioDevice,
        bitrate,
        recordingMode,
        obsAddress,
        obsPassword,
        obsScene,
        ...newSettings,
      });
    }
  };

  // Overlay for dialogs
  // Overlay for dialogs (removed unused renderDialogOverlay)

  return (
    <div className="main-app-bg">
      <header className="main-header-banner modern-header">
        <div className="header-left">
          <span className="header-title">Movlex-League-Recorder</span>
          <span className="header-filename">{currentFilename && ` | ${currentFilename}`}</span>
          {isRecording && (
            <span className="recording-indicator" style={{
              marginLeft: 16,
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'red',
              boxShadow: '0 0 8px 2px #ff0000',
              animation: 'blinker 1s linear infinite',
              verticalAlign: 'middle',
            }} title="Recording..." />
          )}
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            padding: '4px 8px',
            background: recordingMode === 'obs' ? '#6366f1' : '#22c55e',
            color: 'white',
            borderRadius: 4,
            fontWeight: 'bold',
          }} title={recordingMode === 'obs' ? 'Using OBS WebSocket' : 'Using built-in FFmpeg'}>
            {recordingMode === 'obs' ? 'OBS' : 'FFmpeg'}
          </span>
          {recordingMode === 'obs' && obsConnectionStatus.connected && (
            <span style={{
              marginLeft: 4,
              fontSize: 10,
              color: '#22c55e',
              fontWeight: 'bold',
            }}>
              ●
            </span>
          )}
          {recordingMode === 'obs' && !obsConnectionStatus.connected && (
            <span style={{
              marginLeft: 4,
              fontSize: 10,
              color: '#ef4444',
              fontWeight: 'bold',
            }}>
              ●
            </span>
          )}
        </div>
        <div className="header-actions">
          <span className="header-folder" onClick={() => { closeAllDialogs(); handleFileInput(); }} title="Select Recording">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2.17a2 2 0 0 1 1.41.59l2.83 2.83A2 2 0 0 0 12.83 7H21a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
          </span>
          <span className="header-cog" onClick={() => { setShowSettings(true); setShowVideoSettings(false); }} title="Settings">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 12 3.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.2.63.2 1.3 0 1.93z"/></svg>
          </span>
          <span className="header-video-settings" onClick={() => { setShowVideoSettings(true); setShowSettings(false); }} title="Video Settings">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="15" height="10" rx="2"/><path d="M17 9l4 2-4 2V9z"/></svg>
          </span>
        </div>
      </header>
      <main className="main-content">
        <VideoReview setCurrentFilename={setCurrentFilename} latestFile={latestFile} />
      </main>
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }}>
          <div
            className="modal-overlay"
            onClick={() => setShowSettings(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.45)',
              zIndex: 1000,
            }}
          />
          <div className="settings-dropdown" style={{
              maxWidth: 380,
              width: '90%',
              background: '#181a20',
              borderRadius: 12,
              boxShadow: '0 4px 32px #0008',
              padding: 24,
              color: '#fff',
              zIndex: 1001,
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
          }}>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={autoRecord}
                onChange={handleAutoRecordChange}
                style={{ marginRight: 8 }}
              />
              Automatic Recording (in-game)
            </label>
            <button onClick={handleManualStart} disabled={isRecording} style={{ width: '100%', marginBottom: 8 }}>
              Start Recording
            </button>
            <button onClick={handleManualStop} disabled={!isRecording} style={{ width: '100%', marginBottom: 8 }}>
              Stop Recording
            </button>
            <button onClick={handleSetDirectory} style={{ width: '100%', marginBottom: 8 }}>
              Set Recordings Directory
            </button>
            <div style={{ color: '#aaa', fontSize: 13, marginTop: 6, wordBreak: 'break-all', marginBottom: 8 }}>
              Current: {recordingsDirectory}
            </div>
            <button style={{ width: '100%' }} onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}
      {showVideoSettings && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label>Bitrate (e.g. 4M, 10M):</label>
            <input
              type="text"
              value={bitrate}
              onChange={async e => {
                setBitrate(e.target.value);
                if (window.electronAPI?.setVideoSettings) {
                  await window.electronAPI.setVideoSettings({
                    selectedMonitor,
                    resolution,
                    muteMic,
                    framerate,
                    quality,
                    preset,
                    audioDevice: selectedAudioDevice,
                    bitrate: e.target.value,
                  });
                }
              }}
              style={{ maxWidth: 220 }}
            />
          </div>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }}>
            <div
              className="modal-overlay"
              onClick={() => setShowVideoSettings(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.45)',
                zIndex: 1000,
              }}
            />
            <div className="settings-dropdown" style={{
              maxWidth: 380,
              width: '90%',
              background: '#181a20',
              borderRadius: 12,
              boxShadow: '0 4px 32px #0008',
              padding: 24,
              color: '#fff',
              zIndex: 1001,
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}>
              <div style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 16 }}>
                <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>Recording Mode:</label>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recordingMode"
                      value="ffmpeg"
                      checked={recordingMode === 'ffmpeg'}
                      onChange={async e => {
                        if (e.target.checked) {
                          setRecordingMode('ffmpeg');
                          await saveVideoSettings({ recordingMode: 'ffmpeg' });
                        }
                      }}
                      style={{ marginRight: 8 }}
                    />
                    FFmpeg (Built-in recording)
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recordingMode"
                      value="obs"
                      checked={recordingMode === 'obs'}
                      onChange={async e => {
                        if (e.target.checked) {
                          setRecordingMode('obs');
                          await saveVideoSettings({ recordingMode: 'obs' });
                        }
                      }}
                      style={{ marginRight: 8 }}
                    />
                    OBS Mode (Use OBS WebSocket)
                  </label>
                </div>
                {recordingMode === 'obs' && (
                  <div style={{ marginLeft: 20, padding: 12, background: '#0f1419', borderRadius: 8, border: '1px solid #333' }}>
                    <div style={{ marginBottom: 8 }}>
                      <label>OBS WebSocket Address:</label>
                      <input
                        type="text"
                        value={obsAddress}
                        onChange={async e => {
                          setObsAddress(e.target.value);
                          await saveVideoSettings({ obsAddress: e.target.value });
                        }}
                        placeholder="ws://127.0.0.1:4455"
                        style={{ width: '100%', marginTop: 4 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label>OBS WebSocket Password (optional):</label>
                      <input
                        type="password"
                        value={obsPassword}
                        onChange={async e => {
                          setObsPassword(e.target.value);
                          await saveVideoSettings({ obsPassword: e.target.value });
                        }}
                        style={{ width: '100%', marginTop: 4 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label>OBS Scene (optional):</label>
                      <input
                        type="text"
                        value={obsScene}
                        onChange={async e => {
                          setObsScene(e.target.value);
                          await saveVideoSettings({ obsScene: e.target.value });
                        }}
                        placeholder="Scene name to switch to when recording"
                        style={{ width: '100%', marginTop: 4 }}
                      />
                    </div>
                    {obsTestResult.status !== 'idle' && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                        background: obsTestResult.status === 'success' ? '#22c55e20' : 
                                   obsTestResult.status === 'error' ? '#ef444420' : '#3b82f620',
                        color: obsTestResult.status === 'success' ? '#22c55e' : 
                               obsTestResult.status === 'error' ? '#ef4444' : '#3b82f6',
                        border: `1px solid ${obsTestResult.status === 'success' ? '#22c55e' : 
                                             obsTestResult.status === 'error' ? '#ef4444' : '#3b82f6'}`
                      }}>
                        {obsTestResult.status === 'testing' && '⏳ Testing connection...'}
                        {obsTestResult.status === 'success' && '✓ Connected successfully'}
                        {obsTestResult.status === 'error' && `✗ ${obsTestResult.message || 'Connection failed'}`}
                      </div>
                    )}
                    <button
                      onClick={testObsConnection}
                      disabled={obsTestResult.status === 'testing'}
                      style={{
                        marginTop: 8,
                        padding: '6px 12px',
                        background: obsTestResult.status === 'testing' ? '#6b7280' :
                                   obsTestResult.status === 'success' ? '#22c55e' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: obsTestResult.status === 'testing' ? 'not-allowed' : 'pointer',
                        opacity: obsTestResult.status === 'testing' ? 0.7 : 1
                      }}
                    >
                      {obsTestResult.status === 'testing' ? 'Testing...' : 
                       obsTestResult.status === 'success' ? '✓ Test Again' :
                       obsTestResult.status === 'error' ? 'Retry Connection' :
                       'Test Connection'}
                    </button>
                    <button
                      onClick={async () => {
                        if (window.electronAPI?.getObsRecordingSettings) {
                          const result = await window.electronAPI.getObsRecordingSettings();
                          if (result.ok) {
                            alert(`OBS Recording Settings:\n${JSON.stringify(result.settings, null, 2)}`);
                          } else {
                            alert(`Failed to get OBS settings: ${result.error}`);
                          }
                        }
                      }}
                      style={{
                        marginTop: 8,
                        marginLeft: 8,
                        padding: '6px 12px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Debug Settings
                    </button>
                    {obsConnectionStatus.recording && (
                      <span style={{ marginLeft: 8, color: '#fbbf24', fontSize: 12 }}>
                        ● OBS is currently recording
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Monitor/Device:</label>
                <select
                  value={selectedMonitor}
                  onChange={async e => {
                    setSelectedMonitor(e.target.value);
                    await saveVideoSettings({ selectedMonitor: e.target.value });
                  }}
                  style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {avfoundationDevices.length > 0 ? (
                    avfoundationDevices.map(dev => (
                      <option key={dev.value} value={dev.value}>
                        {dev.label}
                      </option>
                    ))
                  ) : (
                    <option value="1">Screen 1</option>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Audio Device:</label>
                <select
                  value={selectedAudioDevice}
                  onChange={async e => {
                    setSelectedAudioDevice(e.target.value);
                    await saveVideoSettings({ audioDevice: e.target.value });
                  }}
                  style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {audioDevices.length > 0 ? (
                    audioDevices.map(dev => (
                      <option key={dev.value} value={dev.value}>
                        {dev.label}
                      </option>
                    ))
                  ) : (
                    <option value="">Default (System Audio)</option>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Resolution:</label>
                <select
                  value={resolution}
                  onChange={async e => {
                    setResolution(e.target.value);
                    await saveVideoSettings({ resolution: e.target.value });
                  }}
                  style={{ maxWidth: 220 }}
                >
                  <option value="1920x1080">1920 x 1080 (16:9)</option>
                  <option value="1280x720">1280 x 720 (16:9)</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={muteMic}
                    onChange={async e => {
                      setMuteMic(e.target.checked);
                      await saveVideoSettings({ muteMic: e.target.checked });
                    }}
                  />
                  Mute Microphone Audio
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Framerate:</label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={framerate}
                  onChange={async e => {
                    setFramerate(Number(e.target.value));
                    await saveVideoSettings({ framerate: Number(e.target.value) });
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Quality (CRF):</label>
                <input
                  type="number"
                  min={10}
                  max={30}
                  value={quality}
                  onChange={async e => {
                    setQuality(Number(e.target.value));
                    await saveVideoSettings({ quality: Number(e.target.value) });
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Preset:</label>
                <select
                  value={preset}
                  onChange={async e => {
                    setPreset(e.target.value);
                    await saveVideoSettings({ preset: e.target.value });
                  }}
                  style={{ maxWidth: 220 }}
                >
                  <option value="ultrafast">Ultrafast (largest file, lowest CPU)</option>
                  <option value="superfast">Superfast</option>
                  <option value="veryfast">Veryfast</option>
                  <option value="faster">Faster</option>
                  <option value="fast">Fast</option>
                  <option value="medium">Medium</option>
                  <option value="slow">Slow (smallest file, highest CPU)</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Bitrate (e.g. 4M, 10M):</label>
                <input
                  type="text"
                  value={bitrate}
                  onChange={async e => {
                    setBitrate(e.target.value);
                    await saveVideoSettings({ bitrate: e.target.value });
                  }}
                  style={{ maxWidth: 220 }}
                />
              </div>
              <button
                style={{ width: '100%', marginTop: 8 }}
                onClick={async () => {
                  // Persist all settings on close
                  await saveVideoSettings({});
                  setShowVideoSettings(false);
                }}
              >Close</button>
              <button
                style={{ width: '100%', marginTop: 8, background: '#222', color: '#fff', border: '1px solid #444' }}
                onClick={async () => {
                  if (window.electronAPI?.getFfmpegCommand) {
                    const cmd = await window.electronAPI.getFfmpegCommand({
                      selectedMonitor,
                      resolution,
                      muteMic,
                      framerate,
                      quality,
                      preset,
                      audioDevice: selectedAudioDevice,
                      bitrate,
                    });
                    console.log('[FFMPEG COMMAND]', cmd);
                    alert('FFmpeg command logged to console.');
                  } else {
                    alert('getFfmpegCommand IPC not available.');
                  }
                }}
              >Log ffmpeg command to console</button>
            </div>
          </div>
        </>
      )}
      {successToast && (
        <div className="toast-success">
          <span>{successToast}</span>
          <button className="toast-close" onClick={() => setSuccessToast(null)}>&times;</button>
        </div>
      )}
    </div>
  );
}

export default App;
