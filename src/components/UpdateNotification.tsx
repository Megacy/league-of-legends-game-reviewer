import React, { useState, useEffect } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

interface UpdateNotificationProps {
  onClose?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onClose }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Get current app version
    window.electronAPI.getAppVersion().then(setCurrentVersion);

    // Listen for update downloaded event
    window.electronAPI.onUpdateDownloaded((_event, info) => {
      setUpdateInfo(info);
    });
  }, []);

  const installUpdate = async () => {
    setIsInstalling(true);
    try {
      await window.electronAPI.installUpdate();
      // App will restart automatically
    } catch (error) {
      console.error('Failed to install update:', error);
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setUpdateInfo(null);
    onClose?.();
  };

  // Only render the modal if there's an update available
  if (!updateInfo) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="update-modal">
          <div className="update-header">
            <h3>🎉 Update Available!</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="update-content">
            <p><strong>New version:</strong> {updateInfo.version}</p>
            <p><strong>Current version:</strong> {currentVersion}</p>
            {updateInfo.releaseDate && (
              <p><strong>Release date:</strong> {new Date(updateInfo.releaseDate).toLocaleDateString()}</p>
            )}
            {updateInfo.releaseNotes && (
              <div className="release-notes">
                <p><strong>What's new:</strong></p>
                <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
              </div>
            )}
          </div>
          
          <div className="update-actions">
            <button 
              className="btn-secondary" 
              onClick={handleClose}
              disabled={isInstalling}
            >
              Later
            </button>
            <button 
              className="btn-primary" 
              onClick={installUpdate}
              disabled={isInstalling}
            >
              {isInstalling ? 'Installing...' : 'Install & Restart'}
            </button>
          </div>
        </div>
      </div>
    );
};
