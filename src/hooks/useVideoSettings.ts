import { useState, useEffect } from 'react';

interface Device {
  value: string;
  label: string;
}

interface AvfoundationDevice {
  type: 'video' | 'audio';
  index: string;
  name: string;
}

interface VideoSettings {
  selectedMonitor: string;
  resolution: string;
  muteMic: boolean;
  framerate: number;
  quality: number;
  preset: string;
  audioDevice: string;
  bitrate: string;
  recordingMode: 'ffmpeg' | 'obs';
  obsAddress: string;
  obsPassword: string;
  obsScene: string;
}

interface UseVideoSettingsReturn {
  // Settings state
  selectedMonitor: string;
  setSelectedMonitor: (value: string) => void;
  resolution: string;
  setResolution: (value: string) => void;
  muteMic: boolean;
  setMuteMic: (value: boolean) => void;
  framerate: number;
  setFramerate: (value: number) => void;
  quality: number;
  setQuality: (value: number) => void;
  preset: string;
  setPreset: (value: string) => void;
  selectedAudioDevice: string;
  setSelectedAudioDevice: (value: string) => void;
  bitrate: string;
  setBitrate: (value: string) => void;
  recordingMode: 'ffmpeg' | 'obs';
  setRecordingMode: (value: 'ffmpeg' | 'obs') => void;
  obsAddress: string;
  setObsAddress: (value: string) => void;
  obsPassword: string;
  setObsPassword: (value: string) => void;
  obsScene: string;
  setObsScene: (value: string) => void;
  
  // Device lists
  avfoundationDevices: Device[];
  audioDevices: Device[];
  
  // Actions
  saveVideoSettings: (updates?: Partial<VideoSettings>) => Promise<void>;
  loadVideoSettings: () => Promise<void>;
}

export const useVideoSettings = (): UseVideoSettingsReturn => {
  const [selectedMonitor, setSelectedMonitor] = useState('1');
  const [resolution, setResolution] = useState('1920x1080');
  const [muteMic, setMuteMic] = useState(false);
  const [framerate, setFramerate] = useState(30);
  const [quality, setQuality] = useState(18);
  const [preset, setPreset] = useState('superfast');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [bitrate, setBitrate] = useState('10M');
  const [recordingMode, setRecordingMode] = useState<'ffmpeg' | 'obs'>('ffmpeg');
  const [obsAddress, setObsAddress] = useState('ws://127.0.0.1:4455');
  const [obsPassword, setObsPassword] = useState('');
  const [obsScene, setObsScene] = useState('');
  const [avfoundationDevices, setAvfoundationDevices] = useState<Device[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);

  // Load settings from backend
  const loadVideoSettings = async () => {
    if (!window.electronAPI?.getVideoSettings) return;
    
    try {
      const settings = await window.electronAPI.getVideoSettings();
      if (settings) {
        if (settings.selectedMonitor) setSelectedMonitor(settings.selectedMonitor);
        if (settings.resolution) setResolution(settings.resolution);
        if (typeof settings.muteMic === 'boolean') setMuteMic(settings.muteMic);
        if (settings.framerate) setFramerate(settings.framerate);
        if (settings.quality) setQuality(settings.quality);
        if (settings.preset) setPreset(settings.preset);
        if (settings.audioDevice) setSelectedAudioDevice(settings.audioDevice);
        if (settings.bitrate) setBitrate(settings.bitrate);
        if (settings.recordingMode) setRecordingMode(settings.recordingMode);
        if (settings.obsAddress) setObsAddress(settings.obsAddress);
        if (settings.obsPassword) setObsPassword(settings.obsPassword);
        if (settings.obsScene) setObsScene(settings.obsScene);
      }
    } catch (e) {
      console.warn('Failed to load video settings:', e);
    }
  };

  // Save settings to backend
  const saveVideoSettings = async (updates: Partial<VideoSettings> = {}) => {
    if (!window.electronAPI?.setVideoSettings) return;

    const currentSettings = {
      selectedMonitor,
      resolution,
      muteMic,
      framerate,
      quality,
      preset,
      audioDevice: selectedAudioDevice,
      bitrate,
      recordingMode,
      obsAddress,
      obsPassword,
      obsScene,
      ...updates
    };

    try {
      await window.electronAPI.setVideoSettings(currentSettings);
    } catch (e) {
      console.warn('Failed to save video settings:', e);
    }
  };

  // Load devices and settings on mount
  useEffect(() => {
    const loadDevices = async () => {
      if (window.electronAPI?.listAvfoundationDevices) {
        try {
          const devices: AvfoundationDevice[] = await window.electronAPI.listAvfoundationDevices();
          
          // Parse video and audio devices from the avfoundation list
          const videoDevices = devices
            .filter((d: AvfoundationDevice) => d.type === 'video')
            .map((d: AvfoundationDevice) => ({ value: d.index, label: `[${d.index}] ${d.name}` }));
          
          const audioDeviceList = devices
            .filter((d: AvfoundationDevice) => d.type === 'audio')
            .map((d: AvfoundationDevice) => ({ value: d.index, label: `[${d.index}] ${d.name}` }));
          
          // Add a default "System Audio" option
          audioDeviceList.unshift({ value: '', label: 'Default (System Audio)' });
          
          setAvfoundationDevices(videoDevices);
          setAudioDevices(audioDeviceList);
        } catch (e) {
          console.warn('Failed to load devices:', e);
        }
      }
    };

    loadDevices();
    loadVideoSettings();
  }, []);

  return {
    selectedMonitor,
    setSelectedMonitor,
    resolution,
    setResolution,
    muteMic,
    setMuteMic,
    framerate,
    setFramerate,
    quality,
    setQuality,
    preset,
    setPreset,
    selectedAudioDevice,
    setSelectedAudioDevice,
    bitrate,
    setBitrate,
    recordingMode,
    setRecordingMode,
    obsAddress,
    setObsAddress,
    obsPassword,
    setObsPassword,
    obsScene,
    setObsScene,
    avfoundationDevices,
    audioDevices,
    saveVideoSettings,
    loadVideoSettings,
  };
};
