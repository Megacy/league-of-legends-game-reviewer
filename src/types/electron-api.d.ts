// src/types/electron-api.d.ts

export type RecordingMode = 'obs' | 'ffmpeg';

export interface EventData {
  EventID: number;
  EventName: string;
  EventTime: number;
  KillerName?: string;
  VictimName?: string;
  Assisters?: string[];
  // Enhanced champion information for ChampionKill events
  KillerChampion?: string;
  VictimChampion?: string;
  AssisterChampions?: string[];
  [key: string]: any;
}

export interface VideoSettings {
  monitor?: string;
  resolution?: string;
  framerate?: number;
  muteMic?: boolean;
  quality?: number;
  preset?: string;
  selectedMonitor?: string;
  audioDevice?: string;
  bitrate?: string;
  // OBS Settings
  recordingMode?: RecordingMode;
  obsAddress?: string;
  obsPassword?: string;
  obsScene?: string;
}

export interface TimelineSettings {
  visibleEventTypes?: string[];
  showOnlyMyKDA?: boolean;
  manualTimingOffset?: number; // Manual offset in seconds to adjust event timing
}

declare global {
  interface ElectronAPI {
    startRecording: (settings?: VideoSettings) => Promise<{ ok: boolean; error?: string; fileBase?: string }>;
    stopRecording: () => Promise<{ ok: boolean; error?: string }>;
    setAutoRecord: (enabled: boolean) => Promise<boolean>;
    getEventsForVideo: (fileBase: string) => Promise<EventData[] | { events: EventData[]; activePlayerName?: string | null }>;
    testLeagueApi: () => Promise<unknown>;
    getLeaguePlayerInfo: () => Promise<{ ok: boolean; playerName?: string; error?: string }>;
    getLatestRecording: () => Promise<string | null>;
    onLoadLatestRecording: (callback: () => void) => void;
    onRecordingStarted: (callback: () => void) => void;
    onRecordingStopped: (callback: () => void) => void;
    selectRecordingsDirectory: () => Promise<{ ok: boolean; directory: string }>;
    selectVideoFile: () => Promise<{ ok: boolean; filePath: string | null }>;
    getRecordingsDirectory: () => Promise<string>;
    exportClip: (params: { fileBase: string; start: number; end: number }) => Promise<{ ok: boolean; error?: string }>;
    isFfmpegAvailable: () => Promise<boolean>;
    getRecordingFilePath: (fileBase: string) => Promise<string>;
    getVideoUrl: (fileBase: string) => Promise<string>;
    getExternalVideoUrl: (filePath: string) => Promise<string>;
    listAvfoundationDevices: () => Promise<any>;
    getFfmpegCommand: (settings: VideoSettings) => Promise<string>;
    getVideoSettings: () => Promise<VideoSettings>;
    getAutoRecord: () => Promise<boolean>;
    setVideoSettings: (settings: VideoSettings) => Promise<{ ok: boolean }>;
    getTimelineSettings: () => Promise<TimelineSettings>;
    setTimelineSettings: (settings: TimelineSettings) => Promise<{ ok: boolean }>;
    openSystemPermissions: (type?: 'screen' | 'mic') => Promise<{ ok: boolean }>;
    hasScreenPermission: () => Promise<boolean>;
    getRecordingMode: () => Promise<RecordingMode>;
    setRecordingMode: (mode: RecordingMode) => Promise<{ ok: boolean }>;
    testObsConnection: (address: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
    getObsConnectionStatus: () => Promise<{ connected: boolean; recording?: boolean }>;
    getObsRecordingSettings: () => Promise<{ ok: boolean; settings?: any; error?: string }>;
  }
  interface Window {
    electronAPI: ElectronAPI;
  }
}


