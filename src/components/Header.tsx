import React from 'react';

interface HeaderProps {
  currentFilename: string;
  isRecording: boolean;
  recordingMode: 'ffmpeg' | 'obs';
  obsConnectionStatus: { connected: boolean; recording?: boolean };
  onFileSelect: () => void;
  onSettingsClick: () => void;
  onVideoSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentFilename,
  isRecording,
  recordingMode,
  obsConnectionStatus,
  onFileSelect,
  onSettingsClick,
  onVideoSettingsClick,
}) => {
  return (
    <header className="main-header-banner modern-header">
      <div className="header-left">
        <span className="header-title">Movlex-League-Recorder</span>
        <span className="header-filename">{currentFilename && ` | ${currentFilename}`}</span>
        {isRecording && (
          <span 
            className="recording-indicator" 
            style={{
              marginLeft: 16,
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'red',
              boxShadow: '0 0 8px 2px #ff0000',
              animation: 'blinker 1s linear infinite',
              verticalAlign: 'middle',
            }} 
            title="Recording..." 
          />
        )}
        <span 
          style={{
            marginLeft: 12,
            fontSize: 12,
            padding: '4px 8px',
            background: recordingMode === 'obs' ? '#6366f1' : '#22c55e',
            color: 'white',
            borderRadius: 4,
            fontWeight: 'bold',
          }} 
          title={recordingMode === 'obs' ? 'Using OBS WebSocket' : 'Using built-in FFmpeg'}
        >
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
        <span 
          className="header-folder" 
          onClick={onFileSelect} 
          title="Select Recording"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2.17a2 2 0 0 1 1.41.59l2.83 2.83A2 2 0 0 0 12.83 7H21a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
          </svg>
        </span>
        <span 
          className="header-cog" 
          onClick={onSettingsClick} 
          title="Settings"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 12 3.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.2.63.2 1.3 0 1.93z"/>
          </svg>
        </span>
        <span 
          className="header-video-settings" 
          onClick={onVideoSettingsClick} 
          title="Video Settings"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="15" height="10" rx="2"/>
            <path d="M17 9l4 2-4 2V9z"/>
          </svg>
        </span>
      </div>
    </header>
  );
};

export default Header;
