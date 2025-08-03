import { useState, useEffect } from 'react';
import VideoReview from './VideoReview';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import VideoSettingsModal from './components/VideoSettingsModal';
import Toast from './components/Toast';
import { UpdateNotification } from './components/UpdateNotification';
import { useVideoSettings } from './hooks/useVideoSettings';
import { useOBS } from './hooks/useOBS';
import './App.css';

function App() {
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [updateToast, setUpdateToast] = useState<string | null>(null);
  
  // App state
  const [autoRecord, setAutoRecord] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentFilename, setCurrentFilename] = useState('');
  const [latestFile, setLatestFile] = useState<string | null>(null);
  const [recordingsDirectory, setRecordingsDirectory] = useState<string>('');

  // Custom hooks
  const videoSettings = useVideoSettings();
  const obs = useOBS();

  // Listen for recording events from backend
  useEffect(() => {
    if (window.electronAPI?.onRecordingStarted) {
      const handler = () => setIsRecording(true);
      window.electronAPI.onRecordingStarted(handler);
    }
    if (window.electronAPI?.onRecordingStopped) {
      const handler = () => setIsRecording(false);
      window.electronAPI.onRecordingStopped(handler);
    }

    // Check for updates on app startup
    if (window.electronAPI?.checkForUpdates) {
      window.electronAPI.checkForUpdates();
    }

    // Listen for update events
    if (window.electronAPI?.onUpdateDownloaded) {
      window.electronAPI.onUpdateDownloaded((_event, info) => {
        setUpdateToast(`Update ${info.version} downloaded! Click to install and restart.`);
      });
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (window.electronAPI?.getLatestRecording && window.electronAPI?.getRecordingsDirectory) {
        const file = await window.electronAPI.getLatestRecording();
        const dir = await window.electronAPI.getRecordingsDirectory();
        if (file) {
          setLatestFile(file);
          setCurrentFilename(file);
        }
        setRecordingsDirectory(dir);
      }

      // Load autoRecord setting
      if (window.electronAPI?.getAutoRecord) {
        try {
          const autoRecordSetting = await window.electronAPI.getAutoRecord();
          setAutoRecord(autoRecordSetting);
        } catch (err) {
          console.error('Failed to load auto record setting:', err);
        }
      }
    };

    loadInitialData();
  }, []);

  // Listen for new recordings
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
    }
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Handlers
  const closeAllDialogs = () => {
    setShowSettings(false);
    setShowVideoSettings(false);
  };

  const handleAutoRecordChange = async (checked: boolean) => {
    setAutoRecord(checked);
    if (window.electronAPI?.setAutoRecord) {
      await window.electronAPI.setAutoRecord(checked);
    }
  };

  const handleManualStart = async () => {
    if (!window.electronAPI?.startRecording) return;

    try {
      const settings = {
        selectedMonitor: videoSettings.selectedMonitor,
        resolution: videoSettings.resolution,
        muteMic: videoSettings.muteMic,
        framerate: videoSettings.framerate,
        quality: videoSettings.quality,
        preset: videoSettings.preset,
        audioDevice: videoSettings.selectedAudioDevice,
        bitrate: videoSettings.bitrate,
        recordingMode: videoSettings.recordingMode,
        obsAddress: videoSettings.obsAddress,
        obsPassword: videoSettings.obsPassword,
        obsScene: videoSettings.obsScene,
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
  };

  const handleManualStop = async () => {
    if (!window.electronAPI?.stopRecording) return;

    try {
      const result = await window.electronAPI.stopRecording();
      if (result?.ok) {
        setIsRecording(false);
      } else {
        const errorMsg = result?.error || 'Failed to stop recording';
        alert(`Failed to stop: ${errorMsg}`);
      }
    } catch (err) {
      alert(`Failed to stop: ${err}`);
    }
  };

  const handleSetDirectory = async () => {
    if (!window.electronAPI?.selectRecordingsDirectory) return;

    try {
      const result = await window.electronAPI.selectRecordingsDirectory();
      if (result?.ok) {
        setRecordingsDirectory(result.directory);
        setSuccessToast('Recordings directory updated');
      }
    } catch (err) {
      alert(`Failed to set directory: ${err}`);
    }
  };

  const handleFileInput = async () => {
    if (!window.electronAPI?.selectVideoFile) return;

    try {
      const result = await window.electronAPI.selectVideoFile();
      if (result?.ok && result.filePath) {
        setLatestFile(result.filePath);
        const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath;
        setCurrentFilename(fileName);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  };

  const handleLogFfmpegCommand = async () => {
    if (!window.electronAPI?.getFfmpegCommand) {
      alert('getFfmpegCommand IPC not available.');
      return;
    }

    const settings = {
      selectedMonitor: videoSettings.selectedMonitor,
      resolution: videoSettings.resolution,
      muteMic: videoSettings.muteMic,
      framerate: videoSettings.framerate,
      quality: videoSettings.quality,
      preset: videoSettings.preset,
      audioDevice: videoSettings.selectedAudioDevice,
      bitrate: videoSettings.bitrate,
    };

    try {
      const cmd = await window.electronAPI.getFfmpegCommand(settings);
      console.log('[FFMPEG COMMAND]', cmd);
      alert('FFmpeg command logged to console.');
    } catch (err) {
      alert(`Failed to get FFmpeg command: ${err}`);
    }
  };

  // Video settings handlers with auto-save
  const handleRecordingModeChange = async (mode: 'ffmpeg' | 'obs') => {
    videoSettings.setRecordingMode(mode);
    await videoSettings.saveVideoSettings({ recordingMode: mode });
  };

  const handleObsAddressChange = async (address: string) => {
    videoSettings.setObsAddress(address);
    await videoSettings.saveVideoSettings({ obsAddress: address });
  };

  const handleObsPasswordChange = async (password: string) => {
    videoSettings.setObsPassword(password);
    await videoSettings.saveVideoSettings({ obsPassword: password });
  };

  const handleObsSceneChange = async (scene: string) => {
    videoSettings.setObsScene(scene);
    await videoSettings.saveVideoSettings({ obsScene: scene });
  };

  const handleMonitorChange = async (monitor: string) => {
    videoSettings.setSelectedMonitor(monitor);
    await videoSettings.saveVideoSettings({ selectedMonitor: monitor });
  };

  const handleAudioDeviceChange = async (device: string) => {
    videoSettings.setSelectedAudioDevice(device);
    await videoSettings.saveVideoSettings({ audioDevice: device });
  };

  const handleResolutionChange = async (resolution: string) => {
    videoSettings.setResolution(resolution);
    await videoSettings.saveVideoSettings({ resolution });
  };

  const handleMuteMicChange = async (mute: boolean) => {
    videoSettings.setMuteMic(mute);
    await videoSettings.saveVideoSettings({ muteMic: mute });
  };

  const handleFramerateChange = async (framerate: number) => {
    videoSettings.setFramerate(framerate);
    await videoSettings.saveVideoSettings({ framerate });
  };

  const handleQualityChange = async (quality: number) => {
    videoSettings.setQuality(quality);
    await videoSettings.saveVideoSettings({ quality });
  };

  const handlePresetChange = async (preset: string) => {
    videoSettings.setPreset(preset);
    await videoSettings.saveVideoSettings({ preset });
  };

  const handleBitrateChange = async (bitrate: string) => {
    videoSettings.setBitrate(bitrate);
    await videoSettings.saveVideoSettings({ bitrate });
  };

  return (
    <div className="main-app-bg">
      <UpdateNotification />
      
      <Header
        currentFilename={currentFilename}
        isRecording={isRecording}
        recordingMode={videoSettings.recordingMode}
        obsConnectionStatus={obs.obsConnectionStatus}
        onFileSelect={() => { closeAllDialogs(); handleFileInput(); }}
        onSettingsClick={() => { setShowSettings(true); setShowVideoSettings(false); }}
        onVideoSettingsClick={() => { setShowVideoSettings(true); setShowSettings(false); }}
      />
      
      <main className="main-content">
        <VideoReview setCurrentFilename={setCurrentFilename} latestFile={latestFile} />
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        autoRecord={autoRecord}
        onAutoRecordChange={handleAutoRecordChange}
        isRecording={isRecording}
        onManualStart={handleManualStart}
        onManualStop={handleManualStop}
        onSetDirectory={handleSetDirectory}
        recordingsDirectory={recordingsDirectory}
        onCheckUpdates={async () => {
          try {
            const result = await window.electronAPI?.checkForUpdates?.();
            if (result && !result.available) {
              setUpdateToast('No updates available. You have the latest version!');
            }
          } catch (_error) {
            setUpdateToast(`Failed to check for updates. Please try again later. ${_error}` );
          }
        }}
      />

      <VideoSettingsModal
        isOpen={showVideoSettings}
        onClose={() => setShowVideoSettings(false)}
        
        // Recording mode and OBS settings
        recordingMode={videoSettings.recordingMode}
        obsAddress={videoSettings.obsAddress}
        obsPassword={videoSettings.obsPassword}
        obsScene={videoSettings.obsScene}
        obsTestResult={obs.obsTestResult}
        obsConnectionStatus={obs.obsConnectionStatus}
        onRecordingModeChange={handleRecordingModeChange}
        onObsAddressChange={handleObsAddressChange}
        onObsPasswordChange={handleObsPasswordChange}
        onObsSceneChange={handleObsSceneChange}
        onTestConnection={() => obs.testObsConnection(videoSettings.obsAddress, videoSettings.obsPassword)}
        onDebugSettings={obs.debugObsSettings}
        
        // Video settings
        selectedMonitor={videoSettings.selectedMonitor}
        avfoundationDevices={videoSettings.avfoundationDevices}
        onMonitorChange={handleMonitorChange}
        
        selectedAudioDevice={videoSettings.selectedAudioDevice}
        audioDevices={videoSettings.audioDevices}
        onAudioDeviceChange={handleAudioDeviceChange}
        
        resolution={videoSettings.resolution}
        onResolutionChange={handleResolutionChange}
        
        muteMic={videoSettings.muteMic}
        onMuteMicChange={handleMuteMicChange}
        
        framerate={videoSettings.framerate}
        onFramerateChange={handleFramerateChange}
        
        quality={videoSettings.quality}
        onQualityChange={handleQualityChange}
        
        preset={videoSettings.preset}
        onPresetChange={handlePresetChange}
        
        bitrate={videoSettings.bitrate}
        onBitrateChange={handleBitrateChange}
        
        onLogFfmpegCommand={handleLogFfmpegCommand}
        onSaveSettings={() => videoSettings.saveVideoSettings()}
      />

      <Toast
        message={successToast}
        onClose={() => setSuccessToast(null)}
        type="success"
      />
      
      <Toast
        message={updateToast}
        onClose={() => setUpdateToast(null)}
        type="success"
      />
    </div>
  );
}

export default App;
