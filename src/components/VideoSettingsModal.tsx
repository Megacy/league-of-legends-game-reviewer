import React from 'react';
import Modal from './Modal';
import OBSSettings from './OBSSettings';

interface Device {
  value: string;
  label: string;
}

interface VideoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Recording mode and OBS settings
  recordingMode: 'ffmpeg' | 'obs';
  obsAddress: string;
  obsPassword: string;
  obsScene: string;
  obsTestResult: { status: 'idle' | 'testing' | 'success' | 'error'; message?: string };
  obsConnectionStatus: { connected: boolean; recording?: boolean };
  onRecordingModeChange: (mode: 'ffmpeg' | 'obs') => void;
  onObsAddressChange: (address: string) => void;
  onObsPasswordChange: (password: string) => void;
  onObsSceneChange: (scene: string) => void;
  onTestConnection: () => void;
  onDebugSettings: () => void;
  
  // Video settings
  selectedMonitor: string;
  avfoundationDevices: Device[];
  onMonitorChange: (monitor: string) => void;
  
  selectedAudioDevice: string;
  audioDevices: Device[];
  onAudioDeviceChange: (device: string) => void;
  
  resolution: string;
  onResolutionChange: (resolution: string) => void;
  
  muteMic: boolean;
  onMuteMicChange: (mute: boolean) => void;
  
  framerate: number;
  onFramerateChange: (framerate: number) => void;
  
  quality: number;
  onQualityChange: (quality: number) => void;
  
  preset: string;
  onPresetChange: (preset: string) => void;
  
  bitrate: string;
  onBitrateChange: (bitrate: string) => void;
  
  onLogFfmpegCommand: () => void;
  onSaveSettings: () => void;
}

const VideoSettingsModal: React.FC<VideoSettingsModalProps> = ({
  isOpen,
  onClose,
  recordingMode,
  obsAddress,
  obsPassword,
  obsScene,
  obsTestResult,
  obsConnectionStatus,
  onRecordingModeChange,
  onObsAddressChange,
  onObsPasswordChange,
  onObsSceneChange,
  onTestConnection,
  onDebugSettings,
  selectedMonitor,
  avfoundationDevices,
  onMonitorChange,
  selectedAudioDevice,
  audioDevices,
  onAudioDeviceChange,
  resolution,
  onResolutionChange,
  muteMic,
  onMuteMicChange,
  framerate,
  onFramerateChange,
  quality,
  onQualityChange,
  preset,
  onPresetChange,
  bitrate,
  onBitrateChange,
  onLogFfmpegCommand,
  onSaveSettings,
}) => {
  const handleClose = () => {
    onSaveSettings();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Video Settings">
      <OBSSettings
        recordingMode={recordingMode}
        obsAddress={obsAddress}
        obsPassword={obsPassword}
        obsScene={obsScene}
        obsTestResult={obsTestResult}
        obsConnectionStatus={obsConnectionStatus}
        onRecordingModeChange={onRecordingModeChange}
        onObsAddressChange={onObsAddressChange}
        onObsPasswordChange={onObsPasswordChange}
        onObsSceneChange={onObsSceneChange}
        onTestConnection={onTestConnection}
        onDebugSettings={onDebugSettings}
      />

      {recordingMode === 'ffmpeg' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label>Monitor/Device:</label>
            <select
              value={selectedMonitor}
              onChange={(e) => onMonitorChange(e.target.value)}
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
              onChange={(e) => onAudioDeviceChange(e.target.value)}
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
              onChange={(e) => onResolutionChange(e.target.value)}
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
                onChange={(e) => onMuteMicChange(e.target.checked)}
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
              onChange={(e) => onFramerateChange(Number(e.target.value))}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Quality (CRF):</label>
            <input
              type="number"
              min={10}
              max={30}
              value={quality}
              onChange={(e) => onQualityChange(Number(e.target.value))}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Preset:</label>
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value)}
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
              onChange={(e) => onBitrateChange(e.target.value)}
              style={{ maxWidth: 220 }}
            />
          </div>
        </>
      )}

      {recordingMode === 'obs' && (
        <div style={{ 
          padding: 16, 
          background: '#0f1419', 
          borderRadius: 8, 
          border: '1px solid #333',
          marginBottom: 12
        }}>
          <p style={{ margin: 0, color: '#aaa', fontSize: 14 }}>
            When using OBS Mode, video and audio settings are configured within OBS Studio itself. 
            This app will control recording start/stop via WebSocket.
          </p>
        </div>
      )}

      <button
        style={{ width: '100%', marginTop: 8 }}
        onClick={handleClose}
      >
        Close
      </button>

      {recordingMode === 'ffmpeg' && (
        <button
          style={{ 
            width: '100%', 
            marginTop: 8, 
            background: '#222', 
            color: '#fff', 
            border: '1px solid #444' 
          }}
          onClick={onLogFfmpegCommand}
        >
          Log ffmpeg command to console
        </button>
      )}
    </Modal>
  );
};

export default VideoSettingsModal;
