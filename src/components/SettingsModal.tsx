import React from 'react';
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
}) => {
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
