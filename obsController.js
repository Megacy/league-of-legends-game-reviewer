// obsController.js
// Handles connecting to OBS and controlling recording via obs-websocket-js

import OBSWebSocket from 'obs-websocket-js';

class OBSController {
  constructor({ address, password }) {
    this.obs = new OBSWebSocket();
    this.address = address;
    this.password = password;
    this.connected = false;
    
    // Handle connection events
    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      console.log('OBS WebSocket connection closed');
    });
    
    this.obs.on('ConnectionError', (err) => {
      this.connected = false;
      console.error('OBS WebSocket connection error:', err);
    });
  }

  async connect() {
    if (this.connected) return;
    
    // If there's an existing connection, disconnect first
    if (this.obs._webSocket && this.obs._webSocket.readyState === 1) {
      await this.disconnect();
    }
    
    try {
      await this.obs.connect(this.address, this.password);
      this.connected = true;
      console.log('Connected to OBS WebSocket');
    } catch (err) {
      this.connected = false;
      console.error('Failed to connect to OBS:', err);
      throw err;
    }
  }

  async disconnect() {
    if (!this.connected) return;
    try {
      await this.obs.disconnect();
      this.connected = false;
      console.log('Disconnected from OBS WebSocket');
    } catch (err) {
      console.error('Error disconnecting from OBS:', err);
    }
  }

  async testConnection() {
    try {
      await this.connect();
      // Test with a simple call
      await this.obs.call('GetVersion');
      return { connected: true, error: null };
    } catch (err) {
      this.connected = false;
      return { connected: false, error: err.message };
    }
  }

  async startRecording() {
    await this.connect();
    try {
      await this.obs.call('StartRecord');
      console.log('Started recording');
      
      // Verify recording actually started
      setTimeout(async () => {
        try {
          const status = await this.obs.call('GetRecordStatus');
          console.log('[OBS] Recording status after start:', status);
          if (!status.outputActive) {
            console.error('[OBS] WARNING: Recording did not actually start!');
          }
        } catch (err) {
          console.error('[OBS] Could not verify recording status:', err.message);
        }
      }, 1000);
      
    } catch (err) {
      console.error('[OBS] Failed to start recording:', err.message);
      throw err;
    }
  }

  async stopRecording() {
    await this.connect();
    try {
      // Check if actually recording before stopping
      const status = await this.obs.call('GetRecordStatus');
      console.log('[OBS] Recording status before stop:', status);
      
      if (status.outputActive) {
        await this.obs.call('StopRecord');
        console.log('Stopped recording');
        
        // Wait a moment for file to be written
        setTimeout(() => {
          console.log('[OBS] Recording file should be written now');
        }, 2000);
      } else {
        console.log('[OBS] Recording was not active, no need to stop');
      }
    } catch (err) {
      console.error('[OBS] Error stopping recording:', err.message);
      // Try to stop anyway
      try {
        await this.obs.call('StopRecord');
        console.log('Stopped recording (forced)');
      } catch (err2) {
        console.error('[OBS] Could not force stop recording:', err2.message);
      }
    }
  }

  async setCurrentScene(sceneName) {
    await this.connect();
    await this.obs.call('SetCurrentProgramScene', { sceneName });
    console.log('Switched to scene:', sceneName);
  }

  async setFilenameFormat(format) {
    await this.connect();
    try {
      // Try different OBS WebSocket API versions for filename formatting
      // For OBS 30+, try SetFilenameFormatting
      await this.obs.call('SetFilenameFormatting', { filenameFormatting: format });
      console.log('Set OBS filename format (v30+):', format);
    } catch (err) {
      try {
        // Fallback: Try older API method
        await this.obs.call('SetRecordingSettings', { 
          recordingSettings: { filenameFormatting: format }
        });
        console.log('Set OBS filename format (fallback):', format);
      } catch (err2) {
        // If both fail, try setting via profile parameters
        console.warn('[OBS] Standard filename methods failed, trying profile parameter...');
        await this.obs.call('SetProfileParameter', {
          parameterCategory: 'Output',
          parameterName: 'FilenameFormatting', 
          parameterValue: format
        });
        console.log('Set OBS filename format (profile):', format);
      }
    }
  }

  async setRecordingDirectory(directory) {
    await this.connect();
    try {
      // Try the standard SetRecordDirectory method first
      await this.obs.call('SetRecordDirectory', { recordDirectory: directory });
      console.log('Set OBS recording directory (standard):', directory);
    } catch (err) {
      console.warn('[OBS] SetRecordDirectory failed:', err.message);
      try {
        // Fallback: Try setting via profile settings for Simple Output Mode
        await this.obs.call('SetProfileParameter', {
          parameterCategory: 'SimpleOutput',
          parameterName: 'FilePath',
          parameterValue: directory
        });
        console.log('Set OBS recording directory (SimpleOutput):', directory);
      } catch (err2) {
        console.warn('[OBS] SimpleOutput method failed, trying AdvOut...');
        try {
          // Fallback: Try Advanced Output Mode
          await this.obs.call('SetProfileParameter', {
            parameterCategory: 'AdvOut',
            parameterName: 'RecFilePath',
            parameterValue: directory
          });
          console.log('Set OBS recording directory (AdvOut):', directory);
        } catch (err3) {
          console.error('[OBS] All directory setting methods failed');
          throw new Error(`Unable to set recording directory. Please manually set OBS output directory to: ${directory}`);
        }
      }
    }
  }

  async configureRecordingSettings(directory, filenameFormat) {
    await this.connect();
    
    try {
      // Set recording directory
      await this.setRecordingDirectory(directory);
    } catch (err) {
      console.warn('[OBS] Could not set recording directory:', err.message);
      // Fallback: try to set via profile settings
      try {
        await this.obs.call('SetProfileParameter', {
          parameterCategory: 'SimpleOutput',
          parameterName: 'FilePath',
          parameterValue: directory
        });
        console.log('Set OBS recording directory via profile settings');
      } catch (err2) {
        console.warn('[OBS] Could not set directory via profile either:', err2.message);
        throw new Error(`Unable to set recording directory. Please set OBS output directory to: ${directory}`);
      }
    }

    try {
      // Set filename format
      await this.setFilenameFormat(filenameFormat);
    } catch (err) {
      console.warn('[OBS] Could not set filename format:', err.message);
    }
  }

  async getRecordingStatus() {
    await this.connect();
    return await this.obs.call('GetRecordStatus');
  }

  async getRecordingSettings() {
    await this.connect();
    try {
      // Try to get current recording settings using different methods
      console.log('[OBS] Attempting to get recording settings...');
      
      // Method 1: Try GetRecordDirectory (newer versions)
      try {
        const settings = await this.obs.call('GetRecordDirectory');
        console.log('[OBS] GetRecordDirectory result:', settings);
        return settings;
      } catch (err) {
        console.log('[OBS] GetRecordDirectory failed:', err.message);
      }
      
      // Method 2: Try getting output settings
      try {
        const outputSettings = await this.obs.call('GetOutputSettings', { outputName: 'simple_file_output' });
        console.log('[OBS] Output settings:', outputSettings);
        return outputSettings;
      } catch (err) {
        console.log('[OBS] GetOutputSettings failed:', err.message);
      }
      
      // Method 3: Try profile parameters
      try {
        const profileSettings = await this.obs.call('GetProfileParameter', {
          parameterCategory: 'SimpleOutput',
          parameterName: 'FilePath'
        });
        console.log('[OBS] Profile settings (SimpleOutput):', profileSettings);
        return { recordDirectory: profileSettings.parameterValue };
      } catch (err) {
        console.log('[OBS] Profile SimpleOutput failed:', err.message);
      }
      
      // Method 4: Try advanced output
      try {
        const advSettings = await this.obs.call('GetProfileParameter', {
          parameterCategory: 'AdvOut',
          parameterName: 'RecFilePath'
        });
        console.log('[OBS] Profile settings (AdvOut):', advSettings);
        return { recordDirectory: advSettings.parameterValue };
      } catch (err) {
        console.log('[OBS] Profile AdvOut failed:', err.message);
      }
      
      return null;
    } catch (err) {
      console.warn('[OBS] Could not get recording settings:', err.message);
      return null;
    }
  }
}

export default OBSController;
