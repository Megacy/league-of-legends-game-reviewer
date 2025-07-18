import React from 'react';

interface OBSSettingsProps {
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
}

const OBSSettings: React.FC<OBSSettingsProps> = ({
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
}) => {
  return (
    <div style={{ marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 16 }}>
      <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>
        Recording Mode:
      </label>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="radio"
            name="recordingMode"
            value="ffmpeg"
            checked={recordingMode === 'ffmpeg'}
            onChange={(e) => e.target.checked && onRecordingModeChange('ffmpeg')}
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
            onChange={(e) => e.target.checked && onRecordingModeChange('obs')}
            style={{ marginRight: 8 }}
          />
          OBS Mode (Use OBS WebSocket)
        </label>
      </div>
      
      {recordingMode === 'obs' && (
        <div style={{ 
          marginLeft: 20, 
          padding: 12, 
          background: '#0f1419', 
          borderRadius: 8, 
          border: '1px solid #333' 
        }}>
          <div style={{ marginBottom: 8 }}>
            <label>OBS WebSocket Address:</label>
            <input
              type="text"
              value={obsAddress}
              onChange={(e) => onObsAddressChange(e.target.value)}
              placeholder="ws://127.0.0.1:4455"
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <label>OBS WebSocket Password (optional):</label>
            <input
              type="password"
              value={obsPassword}
              onChange={(e) => onObsPasswordChange(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <label>OBS Scene (optional):</label>
            <input
              type="text"
              value={obsScene}
              onChange={(e) => onObsSceneChange(e.target.value)}
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
            onClick={onTestConnection}
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
            onClick={onDebugSettings}
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
  );
};

export default OBSSettings;
