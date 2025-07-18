import { useState, useEffect } from 'react';

interface UseOBSReturn {
  obsConnectionStatus: { connected: boolean; recording?: boolean };
  obsTestResult: { status: 'idle' | 'testing' | 'success' | 'error'; message?: string };
  testObsConnection: (address: string, password?: string) => Promise<void>;
  getObsStatus: () => Promise<void>;
  debugObsSettings: () => Promise<void>;
}

export const useOBS = (): UseOBSReturn => {
  const [obsConnectionStatus, setObsConnectionStatus] = useState<{ connected: boolean; recording?: boolean }>({ connected: false });
  const [obsTestResult, setObsTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  const testObsConnection = async (address: string, password?: string) => {
    if (!window.electronAPI?.testObsConnection) return;

    setObsTestResult({ status: 'testing' });
    
    try {
      const result = await window.electronAPI.testObsConnection(address, password);
      if (result.ok) {
        setObsTestResult({ status: 'success' });
        setObsConnectionStatus({ connected: true });
      } else {
        setObsTestResult({ status: 'error', message: result.error });
        setObsConnectionStatus({ connected: false });
      }
    } catch (error) {
      setObsTestResult({ status: 'error', message: 'Connection failed' });
      setObsConnectionStatus({ connected: false });
    }
  };

  const getObsStatus = async () => {
    if (!window.electronAPI?.getObsConnectionStatus) return;

    try {
      const status = await window.electronAPI.getObsConnectionStatus();
      setObsConnectionStatus(status);
    } catch (error) {
      console.warn('Failed to get OBS status:', error);
    }
  };

  const debugObsSettings = async () => {
    if (!window.electronAPI?.getObsRecordingSettings) return;

    try {
      const result = await window.electronAPI.getObsRecordingSettings();
      if (result.ok) {
        alert(`OBS Recording Settings:\n${JSON.stringify(result.settings, null, 2)}`);
      } else {
        alert(`Failed to get OBS settings: ${result.error}`);
      }
    } catch (error) {
      alert(`Error getting OBS settings: ${error}`);
    }
  };

  // Check OBS status periodically
  useEffect(() => {
    const interval = setInterval(getObsStatus, 5000);
    getObsStatus(); // Initial check
    return () => clearInterval(interval);
  }, []);

  return {
    obsConnectionStatus,
    obsTestResult,
    testObsConnection,
    getObsStatus,
    debugObsSettings,
  };
};
