import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoRecord: boolean;
  onAutoRecordChange: (checked: boolean) => void;
  isRecording: boolean;
  onManualStart: () => void;
  onManualStop: () => void;
  onSetDirectory: () => void;
  recordingsDirectory: string;
  onCheckUpdates?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  autoRecord,
  onAutoRecordChange,
  isRecording,
  onManualStart,
  onManualStop,
  onSetDirectory,
  recordingsDirectory,
  onCheckUpdates,
}) => {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // Get app version when modal opens
    if (isOpen && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isOpen]);

  const handleAutoRecordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAutoRecordChange(e.target.checked);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <label style={{ display: 'block', marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={autoRecord}
          onChange={handleAutoRecordChange}
          style={{ marginRight: 8 }}
        />
        Automatic Recording (in-game)
      </label>
      
      <button 
        onClick={onManualStart} 
        disabled={isRecording} 
        style={{ width: '100%', marginBottom: 8 }}
      >
        Start Recording
      </button>
      
      <button 
        onClick={onManualStop} 
        disabled={!isRecording} 
        style={{ width: '100%', marginBottom: 8 }}
      >
        Stop Recording
      </button>
      
      <button 
        onClick={onSetDirectory} 
        style={{ width: '100%', marginBottom: 8 }}
      >
        Set Recordings Directory
      </button>
      
      <div style={{ 
        color: '#aaa', 
        fontSize: 13, 
        marginTop: 6, 
        wordBreak: 'break-all', 
        marginBottom: 8 
      }}>
        Current: {recordingsDirectory}
      </div>
      
      {onCheckUpdates && (
        <button 
          onClick={onCheckUpdates} 
          style={{ width: '100%', marginBottom: 8 }}
        >
          Check for Updates
        </button>
      )}
      
      {appVersion && (
        <div style={{ 
          color: '#888', 
          fontSize: 12, 
          textAlign: 'center', 
          marginBottom: 8,
          paddingTop: 8,
          borderTop: '1px solid #444' 
        }}>
          Version {appVersion}
        </div>
      )}
      
      <button 
        style={{ width: '100%' }} 
        onClick={onClose}
      >
        Close
      </button>
    </Modal>
  );
};

export default SettingsModal;
