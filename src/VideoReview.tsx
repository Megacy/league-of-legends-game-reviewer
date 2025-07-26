import { useRef, useState, useEffect } from 'react';
import './App.css';
import type { EventData, TimelineSettings } from './types/electron-api';
import { 
  calculateGameTimeOffset, 
  groupEvents, 
  DEFAULT_VISIBLE,
  EVENT_TYPE_LABELS,
  type GroupedEvent 
} from './components/TimelineUtils';
import { ChampionKillTooltip, CustomEventTooltip } from './components/TimelineTooltips';

// Helper function to get player name from League Live Client API
async function getPlayerNameFromLeague(): Promise<string | null> {
  try {
    if (window.electronAPI?.getLeaguePlayerInfo) {
      const result = await window.electronAPI.getLeaguePlayerInfo();
      if (result.ok && result.playerName) {
        console.log('[League API] Got player name:', result.playerName);
        return result.playerName;
      } else {
        console.log('[League API] Failed to get player name:', result.error);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('[League API] Error getting player name:', error);
    return null;
  }
}




export default function VideoReview({ setCurrentFilename, latestFile }: { setCurrentFilename?: (filename: string) => void, latestFile?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsMetadata, setEventsMetadata] = useState<{ recordingStartTime?: number; activePlayerName?: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileBase, setFileBase] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<string[]>(DEFAULT_VISIBLE);
  const [showDialog, setShowDialog] = useState(false);
  const [isExternalFile, setIsExternalFile] = useState(false);
  const [showOnlyMyKDA, setShowOnlyMyKDA] = useState(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerNameSource, setPlayerNameSource] = useState<'stored' | 'live' | null>(null);
  const [manualTimingOffset, setManualTimingOffset] = useState<number>(0);

  // Dialog section collapse state
  const [kdaFilterExpanded, setKdaFilterExpanded] = useState(false);
  const [timingAdjustmentExpanded, setTimingAdjustmentExpanded] = useState(false);
  const [eventTypesExpanded, setEventTypesExpanded] = useState(false);

  // Custom tooltip state
  const [tooltipData, setTooltipData] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    group: GroupedEvent | null;
    showKDA: boolean;
    playerName: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    group: null,
    showKDA: false,
    playerName: ''
  });

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
        if (settings.showOnlyMyKDA !== undefined) {
          setShowOnlyMyKDA(settings.showOnlyMyKDA);
        }
        if (settings.manualTimingOffset !== undefined) {
          setManualTimingOffset(settings.manualTimingOffset);
        }
      }).catch(err => {
        console.warn('[VideoReview] Could not load timeline settings:', err);
      });
    }
  }, []);

  // Auto-detect player when events change - try League API first, fallback to event analysis
  useEffect(() => {
    if (events.length > 0 && !playerName) {
      // Try League API first
      getPlayerNameFromLeague().then(leaguePlayerName => {
        if (leaguePlayerName) {
          setPlayerName(leaguePlayerName);
          setPlayerNameSource('live');
          console.log('[VideoReview] Got player name from League API:', leaguePlayerName);
        } else {
          // Fallback: just pick the first non-bot player name from events
          const playerNames = new Set<string>();
          events.forEach(e => {
            if (e.KillerName && !e.KillerName.includes('Bot')) playerNames.add(e.KillerName);
            if (e.VictimName && !e.VictimName.includes('Bot')) playerNames.add(e.VictimName);
            if (e.Assisters) {
              e.Assisters.forEach(name => {
                if (!name.includes('Bot')) playerNames.add(name);
              });
            }
          });
          
          const firstPlayerName = Array.from(playerNames)[0];
          if (firstPlayerName) {
            setPlayerName(firstPlayerName);
            setPlayerNameSource('live');
            console.log('[VideoReview] Fallback: using first player name from events:', firstPlayerName);
          }
        }
      }).catch(error => {
        console.error('[VideoReview] Error getting player name from League API:', error);
      });
    }
  }, [events, playerName]);

  // Save visible types to persistent settings when they change
  useEffect(() => {
    if (window.electronAPI?.setTimelineSettings) {
      const settings: TimelineSettings = {
        visibleEventTypes: visibleTypes,
        showOnlyMyKDA: showOnlyMyKDA,
        manualTimingOffset: manualTimingOffset
      };
      window.electronAPI.setTimelineSettings(settings).catch(err => {
        console.warn('[VideoReview] Could not save timeline settings:', err);
      });
    }
  }, [visibleTypes, showOnlyMyKDA, manualTimingOffset]);
  
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
        
        // Handle both old format (array) and new format (object with metadata)
        let events: EventData[];
        let storedPlayerName: string | null;
        let metadata = null;
        if (Array.isArray(loaded)) {
          // Old format - just events array
          events = loaded;
          storedPlayerName = null;
        } else if (loaded && typeof loaded === 'object' && 'events' in loaded) {
          // New format with metadata
          events = loaded.events;
          storedPlayerName = loaded.activePlayerName || null;
          metadata = (loaded as { metadata?: { recordingStartTime?: number; activePlayerName?: string } }).metadata || null;
        } else {
          events = [];
          storedPlayerName = null;
        }
        
        const normalized = Array.isArray(events)
          ? events.map((e, idx) => ({ ...e, EventID: typeof e.EventID === 'number' ? e.EventID : Number(e.EventID) || idx }))
          : [];
        console.log('[VideoReview] Setting events state:', normalized);
        setEvents(normalized);
        setEventsMetadata(metadata);
        
        // Use stored player name if available, otherwise detect
        if (storedPlayerName) {
          setPlayerName(storedPlayerName);
          setPlayerNameSource('stored');
          console.log('[VideoReview] Using stored player name from recording metadata:', storedPlayerName);
        } else {
          // Reset player name so detection logic can run
          setPlayerName('');
          setPlayerNameSource(null);
          console.log('[VideoReview] No stored player name, will attempt detection');
        }
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
            <span className="timeline-cog" title="Filter event types" onClick={() => {
              setShowDialog(true);
              // Auto-expand sections with active settings
              setKdaFilterExpanded(showOnlyMyKDA);
              setTimingAdjustmentExpanded(manualTimingOffset !== 0);
              setEventTypesExpanded(false); // Keep collapsed by default
            }} style={{ marginLeft: 16 }}>
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
                // Use manual offset if provided, otherwise calculate automatically
                const gameTimeOffset = manualTimingOffset !== 0 ? manualTimingOffset : calculateGameTimeOffset(events, eventsMetadata || undefined);
                const groupedEvents = groupEvents(events, visibleTypes, showOnlyMyKDA, playerName, gameTimeOffset, eventsMetadata || undefined);
                console.log('[Timeline] Total events:', events.length, 'Grouped events:', groupedEvents.length, 'Visible types:', visibleTypes, 'KDA mode:', showOnlyMyKDA, 'Game time offset:', gameTimeOffset, 'Manual offset:', manualTimingOffset);
                return groupedEvents.map((group, idx) => {
                  const duration = videoDuration || videoRef.current?.duration || 1;
                  // Show icon at the actual event time
                  const iconTime = group.startTime;
                  // Position icon at the exact event time percentage
                  const leftPercent = Math.max(0, Math.min(100, (iconTime / duration) * 100));
                  const left = `${leftPercent}%`;
                  
                  // Debug logging for timing issues
                  if(idx < 3 || idx >= groupedEvents.length - 3) {
                    console.log(`[Timeline Debug] Event ${idx}:`, {
                      eventType: group.eventType,
                      originalTime: group.events[0]?.EventTime,
                      adjustedTime: group.startTime,
                      videoDuration: duration,
                      leftPercent,
                      gameTimeOffset
                    });
                  }
                  
                return (
                  <span
                    key={`${group.eventType}-${group.startTime}`}
                    className="timeline-event-icon"
                    style={{
                      left,
                      transform: 'translateX(-50%)', // Center icon on its position
                      opacity: clipMode ? 0.5 : 1,
                      cursor: 'default', // Always default cursor
                      pointerEvents: 'auto', // Allow hover events for tooltips
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipData({
                        visible: true,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        group,
                        showKDA: showOnlyMyKDA,
                        playerName
                      });
                    }}
                    onMouseLeave={() => {
                      setTooltipData(prev => ({ ...prev, visible: false }));
                    }}
                    onClick={e => {
                      // Stop event propagation to prevent timeline click handler from running
                      // with incorrect click position, but still allow seeking to this event's time
                      e.preventDefault();
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.currentTime = group.startTime;
                        setCurrentTime(group.startTime); // Update state immediately
                      }
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
              {showOnlyMyKDA 
                ? "Timeline shows only your kills, deaths, and assists. Hover over icons for details, click anywhere on timeline to seek."
                : "Hover over event icons for details. Click anywhere on the timeline to jump to that part of the video."
              }
              {events.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                  {manualTimingOffset !== 0 ? (
                    <>Manual timing offset: {manualTimingOffset.toFixed(2)}s</>
                  ) : (
                    <>Auto timing offset: {calculateGameTimeOffset(events, eventsMetadata || undefined).toFixed(2)}s 
                    {calculateGameTimeOffset(events, eventsMetadata || undefined) < 0 ? ' (adding loading time)' : ' (subtracting from game time)'}</>
                  )}
                </div>
              )}
            </div>
            {showDialog && (
              <div style={{
                position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
              }} onClick={() => setShowDialog(false)}>
                <div style={{ background: '#232946', color: '#fff', padding: 24, borderRadius: 8, minWidth: 280, maxWidth: 400, textAlign: 'left', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Timeline Settings</h3>
                  
                  {/* KDA Filter Section - Collapsible */}
                  <div style={{ marginBottom: 12 }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        padding: '8px 0',
                        borderBottom: kdaFilterExpanded ? 'none' : '1px solid #444'
                      }}
                      onClick={() => setKdaFilterExpanded(!kdaFilterExpanded)}
                    >
                      <span style={{ marginRight: 8, transform: kdaFilterExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                      <span style={{ fontWeight: 500, color: '#fff' }}>KDA Filter</span>
                      {showOnlyMyKDA && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4caf50', background: 'rgba(76,175,80,0.2)', padding: '2px 6px', borderRadius: 3 }}>
                          ON
                        </span>
                      )}
                    </div>
                    {kdaFilterExpanded && (
                      <div style={{ 
                        paddingLeft: 20, 
                        paddingBottom: 16, 
                        borderBottom: '1px solid #444',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontWeight: 500, color: '#fff', cursor: 'pointer', marginBottom: 12, marginTop: 12 }}>
                          <input
                            type="checkbox"
                            checked={showOnlyMyKDA}
                            onChange={(e) => setShowOnlyMyKDA(e.target.checked)}
                            style={{ marginRight: 8 }}
                          />
                          Show only my KDA (Kills, Deaths, Assists)
                        </label>
                        
                        {/* Show detected player name */}
                        {playerName ? (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
                              Detected Player: <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{playerName}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#666' }}>
                              {playerNameSource === 'stored' 
                                ? 'Stored from recording session' 
                                : 'Detected from League Live Client API'
                              }
                            </div>
                          </div>
                        ) : showOnlyMyKDA && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: '#ff6b35' }}>
                              No player detected. Make sure League of Legends is running.
                            </div>
                          </div>
                        )}
                        
                        {showOnlyMyKDA && (
                          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                            💀 = Death, ⚔️ = Kill, 🤝 = Assist
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Timing Adjustment Section - Collapsible */}
                  <div style={{ marginBottom: 12 }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        padding: '8px 0',
                        borderBottom: timingAdjustmentExpanded ? 'none' : '1px solid #444'
                      }}
                      onClick={() => setTimingAdjustmentExpanded(!timingAdjustmentExpanded)}
                    >
                      <span style={{ marginRight: 8, transform: timingAdjustmentExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                      <span style={{ fontWeight: 500, color: '#fff' }}>Timing Adjustment</span>
                      {manualTimingOffset !== 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4caf50', background: 'rgba(76,175,80,0.2)', padding: '2px 6px', borderRadius: 3 }}>
                          {manualTimingOffset > 0 ? '+' : ''}{manualTimingOffset}s
                        </span>
                      )}
                    </div>
                    {timingAdjustmentExpanded && (
                      <div style={{ 
                        paddingLeft: 20, 
                        paddingBottom: 16, 
                        borderBottom: '1px solid #444',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12, marginTop: 12 }}>
                          Fine-tune event timing if icons don't align with video actions. Negative values add time (for loading screen), positive values subtract time.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <label style={{ color: '#fff', fontSize: 14 }}>Manual Offset:</label>
                          <input
                            type="number"
                            value={manualTimingOffset}
                            onChange={(e) => setManualTimingOffset(parseFloat(e.target.value) || 0)}
                            step="1"
                            style={{
                              background: '#444',
                              border: '1px solid #666',
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: 4,
                              width: '80px'
                            }}
                          />
                          <span style={{ color: '#aaa', fontSize: 12 }}>seconds</span>
                          {manualTimingOffset !== 0 && (
                            <button
                              onClick={() => setManualTimingOffset(0)}
                              style={{
                                background: '#666',
                                border: 'none',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                          Current: {manualTimingOffset !== 0 ? `Manual (${manualTimingOffset}s)` : `Auto (${calculateGameTimeOffset(events, eventsMetadata || undefined).toFixed(1)}s)`}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Event Types Section - Collapsible */}
                  <div style={{ marginBottom: 12 }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        padding: '8px 0',
                        borderBottom: eventTypesExpanded ? 'none' : '1px solid #444'
                      }}
                      onClick={() => setEventTypesExpanded(!eventTypesExpanded)}
                    >
                      <span style={{ marginRight: 8, transform: eventTypesExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                      <span style={{ fontWeight: 500, color: '#fff' }}>Show Event Types</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>({visibleTypes.length}/{typesToShow.length})</span>
                    </div>
                    {eventTypesExpanded && (
                      <div style={{ 
                        paddingLeft: 20, 
                        paddingBottom: 16, 
                        borderBottom: '1px solid #444',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '0 0 4px 4px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                          {typesToShow.map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', fontWeight: 500, color: '#fff' }}>
                              <input
                                type="checkbox"
                                checked={visibleTypes.includes(type)}
                                onChange={() => handleTypeToggle(type)}
                                style={{ marginRight: 8 }}
                                disabled={showOnlyMyKDA && type !== 'ChampionKill'}
                              />
                              <span style={{ opacity: showOnlyMyKDA && type !== 'ChampionKill' ? 0.5 : 1 }}>
                                {EVENT_TYPE_LABELS[type] || type}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
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
          
          {/* Custom Visual Tooltip */}
          {tooltipData.visible && tooltipData.group && (
            <>
              {tooltipData.group.eventType === 'ChampionKill' ? (
                <ChampionKillTooltip 
                  group={tooltipData.group}
                  showKDA={tooltipData.showKDA}
                  playerName={tooltipData.playerName}
                  x={tooltipData.x}
                  y={tooltipData.y}
                />
              ) : (
                <CustomEventTooltip 
                  group={tooltipData.group}
                  x={tooltipData.x}
                  y={tooltipData.y}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
