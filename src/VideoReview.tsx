import { useRef, useState, useEffect } from 'react';
import './App.css';
import type { EventData, TimelineSettings } from './types/electron-api';

const EVENT_TYPE_LABELS: Record<string, string> = {
  ChampionKill: 'Kill',
  ChampionSpecialKill: 'Special Kill',
  FirstBlood: 'First Blood',
  TurretKilled: 'Tower',
  InhibKilled: 'Inhibitor',
  DragonKill: 'Dragon',
  BaronKill: 'Baron',
  HeraldKill: 'Herald',
  Multikill: 'Multikill',
  Ace: 'Ace',
  // ...add more as needed
};

const DEFAULT_VISIBLE = [
  'ChampionKill', 'TurretKilled', 'DragonKill', 'BaronKill', 'FirstBlood', 'Ace', 'InhibKilled', 'HeraldKill', 'Multikill',
];

// Helper function to group events within 10 seconds
interface GroupedEvent {
  eventType: string;
  events: EventData[];
  startTime: number;
  count: number;
  icon: string;
}

function groupEvents(events: EventData[], visibleTypes: string[]): GroupedEvent[] {
  const filteredEvents = events.filter(e => visibleTypes.includes(e.EventName));
  const groups: GroupedEvent[] = [];
  const groupWindow = 20; // 20 seconds grouping window
  
  // Sort events by time
  const sortedEvents = [...filteredEvents].sort((a, b) => a.EventTime - b.EventTime);
  
  for (const event of sortedEvents) {
    // Try to find an existing group for this event type within the time window
    const existingGroup = groups.find(group => 
      group.eventType === event.EventName && 
      Math.abs(event.EventTime - group.startTime) <= groupWindow
    );
    
    if (existingGroup) {
      // Add to existing group
      existingGroup.events.push(event);
      existingGroup.count = existingGroup.events.length;
      // Update start time to be the earliest in the group
      existingGroup.startTime = Math.min(existingGroup.startTime, event.EventTime);
    } else {
      // Create new group
      let icon = '⚔️';
      if (event.EventName === 'ChampionKill') icon = '⚔️';
      else if (event.EventName === 'TurretKilled') icon = '🏰';
      else if (event.EventName === 'DragonKill') icon = '🐉';
      else if (event.EventName === 'BaronKill') icon = '👹';
      else if (event.EventName === 'FirstBlood') icon = '🩸';
      else if (event.EventName === 'Ace') icon = '⭐';
      else if (event.EventName === 'InhibKilled') icon = '💎';
      else if (event.EventName === 'HeraldKill') icon = '🐚';
      else if (event.EventName === 'Multikill') icon = '🔥';
      else if (event.EventName === 'AtakhanKill') icon = '🦎';
      
      groups.push({
        eventType: event.EventName,
        events: [event],
        startTime: event.EventTime,
        count: 1,
        icon
      });
    }
  }
  
  return groups.sort((a, b) => a.startTime - b.startTime);
}

// Helper function to generate enhanced tooltips for grouped events
function generateTooltip(group: GroupedEvent): string {
  const baseText = `${group.count > 1 ? `${group.count}x ` : ''}${EVENT_TYPE_LABELS[group.eventType] || group.eventType} @ ${group.startTime.toFixed(1)}s`;
  
  // For ChampionKill events, show champion vs champion details
  if (group.eventType === 'ChampionKill' && group.events.length > 0) {
    const killDetails = group.events.map(event => {
      if (event.KillerChampion && event.VictimChampion) {
        let killText = `${event.KillerChampion} killed ${event.VictimChampion}`;
        if (event.AssisterChampions && event.AssisterChampions.length > 0) {
          killText += ` (assisted by ${event.AssisterChampions.join(', ')})`;
        }
        return killText;
      } else if (event.KillerName && event.VictimName) {
        // Fallback to summoner names if champion names not available
        let killText = `${event.KillerName} killed ${event.VictimName}`;
        if (event.Assisters && event.Assisters.length > 0) {
          killText += ` (assisted by ${event.Assisters.join(', ')})`;
        }
        return killText;
      }
      return `Kill @ ${event.EventTime.toFixed(1)}s`;
    }).join('\n');
    
    return `${baseText}\n${killDetails}`;
  }
  
  return baseText;
}

export default function VideoReview({ setCurrentFilename, latestFile }: { setCurrentFilename?: (filename: string) => void, latestFile?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileBase, setFileBase] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<string[]>(DEFAULT_VISIBLE);
  const [showDialog, setShowDialog] = useState(false);
  const [isExternalFile, setIsExternalFile] = useState(false);

  // --- Clip selection state ---
  const [clipMode, setClipMode] = useState(false);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [clipSelecting, setClipSelecting] = useState(false);
  const [clipToast, setClipToast] = useState<string | null>(null);

  // --- Current time indicator ---
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Load persistent timeline settings on component mount
  useEffect(() => {
    if (window.electronAPI?.getTimelineSettings) {
      window.electronAPI.getTimelineSettings().then((settings: TimelineSettings) => {
        console.log('[VideoReview] Loaded timeline settings:', settings);
        if (settings.visibleEventTypes && settings.visibleEventTypes.length > 0) {
          setVisibleTypes(settings.visibleEventTypes);
        }
      }).catch(err => {
        console.warn('[VideoReview] Could not load timeline settings:', err);
      });
    }
  }, []);

  // Save visible types to persistent settings when they change
  useEffect(() => {
    if (window.electronAPI?.setTimelineSettings) {
      const settings: TimelineSettings = {
        visibleEventTypes: visibleTypes
      };
      window.electronAPI.setTimelineSettings(settings).catch(err => {
        console.warn('[VideoReview] Could not save timeline settings:', err);
      });
    }
  }, [visibleTypes]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => {
      setVideoDuration(video.duration);
      console.log('[VideoReview] Video duration loaded:', video.duration);
    };
    
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef, videoUrl]);

  // --- Clip preview state ---
  const [clipPreviewing, setClipPreviewing] = useState(false);
  useEffect(() => {
    if (!clipPreviewing || clipStart === null || clipEnd === null || !videoRef.current) return;
    const video = videoRef.current;
    // Seek to start and play
    video.currentTime = Math.min(clipStart, clipEnd);
    video.play();
    const onTimeUpdate = () => {
      if (video.currentTime >= Math.max(clipStart, clipEnd)) {
        video.pause();
        setClipPreviewing(false);
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [clipPreviewing, clipStart, clipEnd]);

  // Auto-load latestFile if provided and not already loaded
  useEffect(() => {
    if (latestFile && latestFile !== fileBase) {
      // Use the unified getVideoUrl method that handles both fileBase and full paths
      if (window.electronAPI?.getVideoUrl) {
        window.electronAPI.getVideoUrl(latestFile).then((videoUrl: string) => {
          setVideoUrl(videoUrl);
        });
      }
      
      // Check if this is an external file (contains path separators) or a fileBase
      const isExternal = latestFile.includes('/') || latestFile.includes('\\');
      setIsExternalFile(isExternal);
      
      if (isExternal) {
        // For external files, use the filename as fileBase for display purposes
        const fileName = latestFile.split(/[/\\]/).pop() || latestFile;
        const baseWithoutExt = fileName.replace(/\.(mov|mp4|avi|mkv)$/i, '');
        setFileBase(baseWithoutExt);
        if (setCurrentFilename) setCurrentFilename(fileName);
        // Don't load events for external files
        setEvents([]);
      } else {
        // Handle recording from recordings directory
        setFileBase(latestFile);
        if (setCurrentFilename) setCurrentFilename(`${latestFile}.mov`);
        // Events will be loaded by the separate useEffect below
      }
    }
  }, [latestFile, fileBase, setCurrentFilename]);

  // Load events when fileBase changes or when a new file is loaded
  useEffect(() => {
    if (fileBase && window.electronAPI?.getEventsForVideo) {
      console.log('[VideoReview] Loading events for fileBase:', fileBase);
      console.log('[VideoReview] isExternalFile:', isExternalFile);
      console.log('[VideoReview] latestFile:', latestFile);
      
      // For external files, pass the original file path so backend can look for events in the same directory
      const searchKey = isExternalFile && latestFile ? latestFile : fileBase;
      
      window.electronAPI.getEventsForVideo(searchKey).then(loaded => {
        console.log('[VideoReview] Events loaded:', loaded);
        const normalized = Array.isArray(loaded)
          ? loaded.map((e, idx) => ({ ...e, EventID: typeof e.EventID === 'number' ? e.EventID : Number(e.EventID) || idx }))
          : [];
        console.log('[VideoReview] Setting events state:', normalized);
        setEvents(normalized);
      });
    }
  }, [fileBase, isExternalFile, latestFile]);

  // Debug useEffect to track events changes
  useEffect(() => {
    console.log('[VideoReview] Events state changed:', events.length, 'events:', events.map(e => e.EventName));
  }, [events]);

  // Dialog for filtering event types
  const fallbackTypes = Object.keys(EVENT_TYPE_LABELS);
  const allTypes = Array.from(new Set(events.map(e => e.EventName)));
  const typesToShow = allTypes.length > 0 ? allTypes : fallbackTypes;
  const handleTypeToggle = (type: string) => {
    setVisibleTypes(v => v.includes(type) ? v.filter(t => t !== type) : [...v, type]);
  };

  // Handle timeline mouse events for clip selection
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clipMode || !videoRef.current) return;
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const duration = videoRef.current.duration;
    if (!isNaN(duration)) {
      const time = Math.max(0, Math.min(duration, percent * duration));
      setClipStart(time);
      setClipEnd(time);
      setClipSelecting(true);
    }
  };
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clipMode || !clipSelecting || !videoRef.current) return;
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const duration = videoRef.current.duration;
    if (!isNaN(duration)) {
      const time = Math.max(0, Math.min(duration, percent * duration));
      setClipEnd(time);
    }
  };
  const handleTimelineMouseUp = () => {
    if (clipMode && clipSelecting) setClipSelecting(false);
  };
  const handleCancelClip = () => {
    setClipMode(false);
    setClipStart(null);
    setClipEnd(null);
    setClipSelecting(false);
  };

  // Auto-dismiss clip toast after 3 seconds
  useEffect(() => {
    if (clipToast) {
      const timer = setTimeout(() => setClipToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [clipToast]);

  return (
    <div className="video-review-container">
      {/* Only show h2 if no video is loaded */}
      {!videoUrl && <h2>Review Recording</h2>}
      {/* Remove file input, as folder icon is used for selection */}
      {videoUrl && (
        <>
          <div className="video-large-container">
            <video ref={videoRef} src={videoUrl} controls className="review-video-large" />
          </div>
          {/* --- Centered Create Clip, clip actions, and timeline settings cog above timeline --- */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '8px 0 8px 0', width: '100%', maxWidth: 1100 }}>
            {!clipMode && videoUrl && (
              <button className="clip-btn" onClick={() => setClipMode(true)}>
                🎬 Create Clip
              </button>
            )}
            {clipMode && (
              <>
                <button className="clip-btn" style={{ background: '#aaa', color: '#232946' }} onClick={handleCancelClip}>Cancel</button>
                <button
                  className="clip-btn"
                  style={{ background: '#2196f3', color: '#fff', marginLeft: 8 }}
                  onClick={() => setClipPreviewing(true)}
                  disabled={clipPreviewing || clipStart === null || clipEnd === null || Math.abs(clipEnd - clipStart) < 1}
                >
                  ▶️ Preview Clip
                </button>
                <button
                  className="clip-btn"
                  style={{ background: '#4caf50', color: '#fff', marginLeft: 8 }}
                  disabled={clipStart === null || clipEnd === null || Math.abs(clipEnd - clipStart) < 1}
                  onClick={async () => {
                    if (!fileBase || clipStart === null || clipEnd === null) return;
                    // Call backend to export clip
                    const start = Math.min(clipStart, clipEnd);
                    const end = Math.max(clipStart, clipEnd);
                    if (window.electronAPI?.exportClip) {
                      const result = await window.electronAPI.exportClip({ fileBase, start, end });
                      if (result?.ok) setClipToast('Clip exported!');
                      else setClipToast('Clip export failed.');
                    }
                    setClipMode(false);
                    setClipStart(null);
                    setClipEnd(null);
                  }}
                >Export Clip</button>
              </>
            )}
            {/* Timeline settings cog, always shown */}
            <span className="timeline-cog" title="Filter event types" onClick={() => setShowDialog(true)} style={{ marginLeft: 16 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#232946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 12 3.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.2.63.2 1.3 0 1.93z"/></svg>
            </span>
          </div>
          {/* Horizontal timeline below video */}
          <div className="timeline-horizontal-panel">
            <div
              className="timeline-horizontal"
              onClick={e => {
                if (!videoRef.current) return;
                if (!clipMode) {
                  const rect = (e.target as HTMLDivElement).getBoundingClientRect();
                  const x = (e as React.MouseEvent).clientX - rect.left;
                  const percent = x / rect.width;
                  const duration = videoRef.current.duration;
                  if (!isNaN(duration)) {
                    const newTime = percent * duration;
                    videoRef.current.currentTime = newTime;
                    setCurrentTime(newTime); // <-- update state for instant indicator
                  }
                }
              }}
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              style={{ position: 'relative' }}
            >
              {/* --- Current time indicator line --- */}
              {videoRef.current && (
                <div
                  className="timeline-current-time-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${(currentTime / (videoDuration || videoRef.current.duration || 1)) * 100}%`,
                    width: 2,
                    height: '100%',
                    background: '#4caf50',
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* --- Clip selection highlight --- */}
              {clipMode && clipStart !== null && clipEnd !== null && (
                <div
                  className="clip-selection-highlight"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${Math.min(clipStart, clipEnd) / (videoRef.current?.duration || 1) * 100}%`,
                    width: `${Math.abs(clipEnd - clipStart) / (videoRef.current?.duration || 1) * 100}%`,
                    height: '100%',
                    background: 'rgba(76,175,80,0.25)',
                    border: '2px solid #4caf50',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
              )}
              {/* Render event icons on timeline */}
              {(() => {
                const groupedEvents = groupEvents(events, visibleTypes);
                console.log('[Timeline] Total events:', events.length, 'Grouped events:', groupedEvents.length, 'Visible types:', visibleTypes);
                return groupedEvents.map((group, idx) => {
                  const duration = videoDuration || videoRef.current?.duration || 1;
                  // Show icon at the actual event time
                  const iconTime = group.startTime;
                  // Constrain to 0-92% to prevent overflow (leaving room for icon width)
                  const leftPercent = Math.min(92, Math.max(0, (iconTime / duration) * 100));
                  const left = `${leftPercent}%`;
                  
                  // Debug logging
                  if (idx === 0) {
                    console.log('[Timeline] Rendering grouped events:', groupedEvents.length, 'duration:', duration, 'first group time:', group.startTime, 'left:', left);
                  }
                  
                return (
                  <span
                    key={`${group.eventType}-${group.startTime}`}
                    className="timeline-event-icon"
                    style={{
                      left,
                      opacity: clipMode ? 0.5 : 1,
                      cursor: clipMode ? 'not-allowed' : 'pointer',
                      pointerEvents: clipMode ? 'none' : 'auto',
                    }}
                    title={generateTooltip(group)}
                    onClick={e => {
                      if (clipMode) return;
                      e.stopPropagation();
                      if (videoRef.current) videoRef.current.currentTime = group.startTime;
                    }}
                  >
                    {group.icon}
                    {group.count > 1 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#ff6b35',
                        color: 'white',
                        borderRadius: '50%',
                        fontSize: '10px',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                      }}>
                        {group.count}
                      </span>
                    )}
                  </span>
                );
                });
              })()}
              {/* Clip selection range (if active) */}
              {clipMode && clipStart !== null && clipEnd !== null && (
                <div className="clip-selection-range" style={{
                  position: 'absolute',
                  left: `${(clipStart / (videoRef.current?.duration || 1)) * 100}%`,
                  width: `${((clipEnd - clipStart) / (videoRef.current?.duration || 1)) * 100}%`,
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  pointerEvents: 'none',
                  borderRadius: 4,
                }} />
              )}
            </div>
            <div style={{ marginTop: 8, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Click anywhere on the timeline or on an event icon to jump to that part of the video.
            </div>
            {showDialog && (
              <div style={{
                position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
              }} onClick={() => setShowDialog(false)}>
                <div style={{ background: '#232946', color: '#fff', padding: 24, borderRadius: 8, minWidth: 300, textAlign: 'left', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Show Event Types</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {typesToShow.map(type => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', fontWeight: 500, color: '#fff' }}>
                        <input
                          type="checkbox"
                          checked={visibleTypes.includes(type)}
                          onChange={() => handleTypeToggle(type)}
                          style={{ marginRight: 8 }}
                        />
                        {EVENT_TYPE_LABELS[type] || type}
                      </label>
                    ))}
                  </div>
                  <button style={{ marginTop: 20, background: '#fff', color: '#232946', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={() => setShowDialog(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
          {clipToast && (
            <div className="toast-success">
              <span>{clipToast}</span>
              <button className="toast-close" onClick={() => setClipToast(null)}>&times;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
