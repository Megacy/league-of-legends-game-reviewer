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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
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

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.available && result.updateInfo) {
        setUpdateInfo(result.updateInfo);
      } else {
        // Show temporary message if no updates
        setTimeout(() => {
          setIsCheckingUpdate(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setIsCheckingUpdate(false);
    }
  };

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

  if (updateInfo && !isInstalling) {
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
              onClick={onClose}
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
  }

  return (
    <div className="update-checker">
      <button 
        className="check-updates-btn"
        onClick={checkForUpdates}
        disabled={isCheckingUpdate}
        title="Check for app updates"
      >
        {isCheckingUpdate ? '🔄' : '⬇️'} 
        {isCheckingUpdate ? ' Checking...' : ' Check Updates'}
      </button>
    </div>
  );
};
