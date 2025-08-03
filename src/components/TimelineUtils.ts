import type { EventData } from '../types/electron-api';

export const EVENT_TYPE_LABELS: Record<string, string> = {
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

export const DEFAULT_VISIBLE = [
  'ChampionKill', 'TurretKilled', 'DragonKill', 'BaronKill', 'FirstBlood', 'Ace', 'InhibKilled', 'HeraldKill', 'Multikill',
];

// Helper function to check if an event is related to player's KDA
export function isPlayerKDAEvent(event: EventData, playerName: string): boolean {
  if (!playerName || event.EventName !== 'ChampionKill') return false;
  
  // Player got a kill
  if (event.KillerName === playerName) return true;
  
  // Player died
  if (event.VictimName === playerName) return true;
  
  // Player got an assist
  if (event.Assisters && event.Assisters.includes(playerName)) return true;
  
  return false;
}

// Helper function to get icon for KDA events
export function getKDAIcon(event: EventData, playerName: string): string {
  if (event.VictimName === playerName) {
    return '💀'; // Death (skull icon)
  } else if (event.KillerName === playerName) {
    return '⚔️'; // Kill
  } else if (event.Assisters && event.Assisters.includes(playerName)) {
    return '🤝'; // Assist
  }
  return '⚔️'; // Default
}

interface EventsMetadata {
  recordedAt?: string;
  recordingStartTime?: number; // Wall-clock timestamp when recording started
  activePlayerName?: string;
  totalEvents?: number;
  isMidGameRecording?: boolean; // Indicates if recording started mid-game
  gameStartTime?: number; // Game time when recording started (for mid-game recordings)
  recordingGameStartTime?: number; // Game time of first captured event (for mid-game recordings)
}

interface EnhancedEventData extends EventData {
  capturedAt?: number; // Wall-clock timestamp when event was captured
}

// Helper function to calculate timing offset between game time and video time
export function calculateGameTimeOffset(events: EventData[], eventsMetadata?: EventsMetadata): number {
  // Core problem: Video recording starts when League API becomes available (during loading screen)
  // Game events are timestamped from actual game start (after loading completes)
  // We need to calculate the loading screen duration to align events with video timeline
  
  // For mid-game recordings, we need to adjust the approach:
  // - Historical events (before recording) should be filtered out
  // - Live events should be positioned relative to recording start, not game start
  
  if (!events || events.length === 0) {
    console.log('[Timeline] No events available, using default loading estimate of 75s');
    return 75; // Default loading time estimate
  }
  
  console.log('[Timeline] Calculating loading time offset from', events.length, 'events');
  
  // Strategy 1: Use wall-clock timestamps if available (most accurate)
  if (eventsMetadata?.recordingStartTime) {
    console.log('[Timeline] Using Strategy 1: Wall-clock timestamps');
    
    // Look for events with capturedAt timestamps
    const eventsWithTimestamps = events.filter(e => (e as EnhancedEventData).capturedAt);
    
    if (eventsWithTimestamps.length > 0) {
      const recordingStartMs = eventsMetadata.recordingStartTime;
      
      // Filter events that were actually captured AFTER recording started
      // This handles mid-game recordings where the API dumps historical events
      const relevantEvents = eventsWithTimestamps.filter(e => {
        const capturedMs = (e as EnhancedEventData).capturedAt!;
        const timeSinceRecording = capturedMs - recordingStartMs;
        
        // Event must have been captured at least 1 second after recording started
        // to be considered "real" (not historical dump)
        return timeSinceRecording >= 1000;
      });
      
      console.log('[Timeline] Events with timestamps:', eventsWithTimestamps.length);
      console.log('[Timeline] Events captured after recording start:', relevantEvents.length);
      
      if (relevantEvents.length === 0) {
        // This is likely a mid-game recording where all events are historical
        // For mid-game recordings, we need special handling in the timeline display
        console.log('[Timeline] Mid-game recording detected - all events are historical');
        
        // Mark the metadata to indicate this is a mid-game recording
        if (eventsMetadata) {
          eventsMetadata.isMidGameRecording = true;
          eventsMetadata.gameStartTime = events.find(e => e.EventName === 'GameStart')?.EventTime || 0;
        }
        
        return 0; // No offset for pure mid-game recordings
      }
      
      // Use the first relevant event to calculate offset
      const firstRelevantEvent = relevantEvents[0];
      const eventCapturedMs = (firstRelevantEvent as EnhancedEventData).capturedAt!;
      const gameTimeMs = firstRelevantEvent.EventTime * 1000;
      const videoTimeMs = eventCapturedMs - recordingStartMs;
      
      // Validation: Check if the calculated timing makes sense
      const offsetMs = videoTimeMs - gameTimeMs;
      const offsetSeconds = offsetMs / 1000;
      
      console.log('[Timeline] Calculated precise offset:', offsetSeconds.toFixed(3), 's from', firstRelevantEvent.EventName, 'event');
      
      // Sanity check: offset should be reasonable (between -300s and +300s)
      if (Math.abs(offsetSeconds) > 300) {
        console.warn('[Timeline] Calculated offset seems unreasonable:', offsetSeconds.toFixed(1), 's - using fallback');
        return 75; // Fallback to default
      }
      
      // Check if this looks like a full game recording vs mid-game
      const isFullGameRecording = firstRelevantEvent.EventTime < 30; // First event within 30s of game start
      
      if (isFullGameRecording) {
        const result = Math.max(0, offsetSeconds);
        console.log('[Timeline] ✓ Using precise wall-clock calculation:', result.toFixed(3), 's');
        return result;
      } else {
        // Mid-game recording - store info for special timeline handling
        console.log('[Timeline] Mid-game recording detected:');
        console.log('  - First captured event:', firstRelevantEvent.EventName, 'at', firstRelevantEvent.EventTime, 's game time');
        console.log('  - Event appears at:', (videoTimeMs / 1000).toFixed(1), 's in video');
        
        // Mark the metadata and first relevant event for special handling
        if (eventsMetadata) {
          eventsMetadata.isMidGameRecording = true;
          eventsMetadata.recordingGameStartTime = firstRelevantEvent.EventTime;
        }
        
        // For mid-game recordings, we offset events to be relative to the first captured event
        // This makes the timeline show time relative to when recording started
        return -firstRelevantEvent.EventTime; // Negative offset to make first event appear at video time 0
      }
    }
    
    // Fallback: Use GameStart event timing with recording start time
    const gameStartEvent = events.find(e => e.EventName === 'GameStart');
    if (gameStartEvent && typeof gameStartEvent.EventTime === 'number') {
      // If GameStart time is large, this might be a mid-game recording
      const gameStartTime = gameStartEvent.EventTime;
      
      if (gameStartTime > 30) {
        console.log('[Timeline] Mid-game recording detected (GameStart at', gameStartTime, 's)');
        
        if (eventsMetadata) {
          eventsMetadata.isMidGameRecording = true;
          eventsMetadata.gameStartTime = gameStartTime;
        }
        
        return -gameStartTime; // Offset to make events relative to recording start
      } else {
        console.log('[Timeline] Using recording start time with GameStart:');
        console.log('  - Recording started at:', new Date(eventsMetadata.recordingStartTime).toISOString());
        console.log('  - GameStart event at:', gameStartEvent.EventTime, 's after recording started');
        console.log('  - Calculated loading time:', gameStartTime.toFixed(3), 's');
        
        return gameStartTime;
      }
    }
  }
  
  // Strategy 2: Use MinionsSpawning as reference (fallback)
  const minionsEvent = events.find(e => e.EventName === 'MinionsSpawning');
  if (minionsEvent && typeof minionsEvent.EventTime === 'number' && minionsEvent.EventTime > 0) {
    
    // More sophisticated heuristic based on game patterns:
    let estimatedLoadingTime = 75; // Default baseline
    
    // Check if GameStart is very close to 0 (suggests minimal loading delay)
    const gameStartEvent = events.find(e => e.EventName === 'GameStart');
    const gameStartNearZero = gameStartEvent && Math.abs(gameStartEvent.EventTime) < 0.5;
    
    // Look for early activity indicators
    const firstBloodEvent = events.find(e => e.EventName === 'FirstBlood');
    const earlyKills = events.filter(e => 
      e.EventName === 'ChampionKill' && 
      typeof e.EventTime === 'number' && 
      e.EventTime < 200 // Within first ~3 minutes
    );
    
    if (gameStartNearZero) {
      // GameStart close to 0 suggests the API was available immediately when game started
      // This usually means shorter loading time
      if (firstBloodEvent && firstBloodEvent.EventTime < 120) {
        // Early first blood + quick start = short loading
        estimatedLoadingTime = 20;
      } else {
        // Quick start but no early action = moderate loading
        estimatedLoadingTime = 35;
      }
    } else {
      // GameStart not at 0, use activity patterns
      if (firstBloodEvent && firstBloodEvent.EventTime < 100) {
        // Very early first blood suggests active players, probably shorter loading
        estimatedLoadingTime = 25;
      } else if (earlyKills.length >= 3) {
        // Multiple early kills = active game, moderate loading
        estimatedLoadingTime = 45;
      } else if (earlyKills.length === 0) {
        // No early kills = passive game or longer loading
        estimatedLoadingTime = 90;
      } else {
        // Some early activity, use default
        estimatedLoadingTime = 75;
      }
    }
    
    console.log('[Timeline] Using MinionsSpawning fallback estimate:', estimatedLoadingTime, 's');
    return estimatedLoadingTime;
  }
  
  // Strategy 3: Use GameStart event timing
  const gameStartEvent = events.find(e => e.EventName === 'GameStart');
  if (gameStartEvent && typeof gameStartEvent.EventTime === 'number') {
    const gameStartTime = gameStartEvent.EventTime;
    
    if (Math.abs(gameStartTime) < 0.5) {
      // Very close to 0, minimal loading
      console.log('[Timeline] GameStart at', gameStartTime, 's - minimal loading estimated');
      return 30; // Conservative minimal loading
    } else {
      // GameStart offset might indicate timing issues, use moderate estimate
      console.log('[Timeline] GameStart at', gameStartTime, 's - moderate loading estimated');
      return 75;
    }
  }
  
  // Strategy 3: Analyze event patterns to estimate loading
  const earlyEvents = events.filter(e => 
    e.EventTime !== undefined && 
    typeof e.EventTime === 'number' &&
    e.EventTime < 300 && // Within first 5 minutes
    e.EventTime > 0 && 
    ['ChampionKill', 'TurretKilled', 'DragonKill', 'FirstBlood'].includes(e.EventName)
  ).sort((a, b) => a.EventTime - b.EventTime);
  
  if (earlyEvents.length > 0) {
    const firstEventTime = earlyEvents[0].EventTime;
    let estimatedLoadingTime;
    
    if (firstEventTime < 120) {
      // Early action, probably shorter loading
      estimatedLoadingTime = 45;
    } else if (firstEventTime < 240) {
      // Medium paced start
      estimatedLoadingTime = 75;
    } else {
      // Late action, longer loading or passive game
      estimatedLoadingTime = 105;
    }
    
    console.log('[Timeline] Event pattern analysis:');
    console.log('  - First significant event at:', firstEventTime, 's game time');
    console.log('  - Estimated loading time:', estimatedLoadingTime, 's');
    return estimatedLoadingTime;
  }
  
  console.log('[Timeline] No reliable reference found, using default loading time of 75s');
  return 75;
}

// Helper function to group events within 10 seconds
export interface GroupedEvent {
  eventType: string;
  events: EventData[];
  startTime: number;
  count: number;
  icon: string;
}

export function groupEvents(events: EventData[], visibleTypes: string[], showOnlyMyKDA: boolean = false, playerName: string = '', gameTimeOffset: number = 0, eventsMetadata?: EventsMetadata): GroupedEvent[] {
  if (!events || events.length === 0) {
    console.log('[Timeline] No events to group');
    return [];
  }

  let filteredEvents = events.filter(e => 
    visibleTypes.includes(e.EventName) && 
    typeof e.EventTime === 'number' && 
    e.EventTime >= 0
  );
  
  // For mid-game recordings, filter out historical events
  if (eventsMetadata?.isMidGameRecording && eventsMetadata.recordingStartTime) {
    console.log('[Timeline] Mid-game recording detected - filtering historical events');
    const recordingStartMs = eventsMetadata.recordingStartTime;
    
    filteredEvents = filteredEvents.filter(e => {
      const enhancedEvent = e as EnhancedEventData;
      if (!enhancedEvent.capturedAt) return false;
      
      const timeSinceRecording = enhancedEvent.capturedAt - recordingStartMs;
      const isHistorical = timeSinceRecording < 1000; // Captured within 1 second = historical
      
      if (isHistorical) {
        console.log('[Timeline] Filtering out historical event:', e.EventName, 'at', e.EventTime, 's');
        return false;
      }
      
      return true;
    });
    
    console.log('[Timeline] After filtering historical events:', filteredEvents.length, 'remaining');
  }
  
  // Additional filtering for KDA events if enabled
  if (showOnlyMyKDA && playerName) {
    filteredEvents = filteredEvents.filter(e => isPlayerKDAEvent(e, playerName));
  }
  
  if (filteredEvents.length === 0) {
    console.log('[Timeline] No events match filters');
    return [];
  }
  
  const groups: GroupedEvent[] = [];
  const groupWindow = 20; // 20 seconds grouping window
  
  // Sort events by time
  const sortedEvents = [...filteredEvents].sort((a, b) => a.EventTime - b.EventTime);
  
  console.log('[Timeline] Grouping', sortedEvents.length, 'events with gameTimeOffset:', gameTimeOffset.toFixed(3), 's');
  
  for (const event of sortedEvents) {
    // Convert game time to video time by adding the loading time offset
    // The offset represents the loading screen duration that happens before game events
    const videoTime = Math.max(0, event.EventTime + gameTimeOffset);
    
    if (sortedEvents.indexOf(event) < 3) { // Log first few events for debugging
      console.log(`[Timeline] Event ${event.EventName} at game time ${event.EventTime.toFixed(1)}s -> video time ${videoTime.toFixed(1)}s`);
    }
    
    // Try to find an existing group for this event type within the time window
    const existingGroup = groups.find(group => 
      group.eventType === event.EventName && 
      Math.abs(videoTime - group.startTime) <= groupWindow
    );
    
    if (existingGroup) {
      // Add to existing group
      existingGroup.events.push(event);
      existingGroup.count = existingGroup.events.length;
      // Update start time to be the earliest in the group
      existingGroup.startTime = Math.min(existingGroup.startTime, videoTime);
    } else {
      // Create new group
      let icon = '⚔️';
      
      // Use KDA-specific icons if in KDA mode
      if (showOnlyMyKDA && playerName && event.EventName === 'ChampionKill') {
        icon = getKDAIcon(event, playerName);
      } else {
        // Default icon mapping
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
      }
      
      groups.push({
        eventType: event.EventName,
        events: [event],
        startTime: videoTime, // Use the converted video time
        count: 1,
        icon
      });
    }
  }
  
  const sortedGroups = groups.sort((a, b) => a.startTime - b.startTime);
  console.log('[Timeline] Created', sortedGroups.length, 'event groups, positioned from', 
    sortedGroups[0]?.startTime.toFixed(1) || 'N/A', 's to', 
    sortedGroups[sortedGroups.length - 1]?.startTime.toFixed(1) || 'N/A', 's in video');
  return sortedGroups;
}

// Helper function to generate enhanced tooltips for grouped events
export function generateTooltip(group: GroupedEvent, showOnlyMyKDA: boolean = false, playerName: string = ''): string {
  const baseText = `${group.count > 1 ? `${group.count}x ` : ''}${EVENT_TYPE_LABELS[group.eventType] || group.eventType} @ ${group.startTime.toFixed(1)}s`;
  
  // For ChampionKill events, show champion vs champion details
  if (group.eventType === 'ChampionKill' && group.events.length > 0) {
    const killDetails = group.events.map(event => {
      let killText = '';
      
      // If in KDA mode, add context about the player's role
      if (showOnlyMyKDA && playerName) {
        if (event.VictimName === playerName) {
          killText = `💀 YOU died to ${event.KillerChampion || event.KillerName}`;
        } else if (event.KillerName === playerName) {
          killText = `⚔️ YOU killed ${event.VictimChampion || event.VictimName}`;
        } else if (event.Assisters && event.Assisters.includes(playerName)) {
          killText = `🤝 YOU assisted: ${event.KillerChampion || event.KillerName} killed ${event.VictimChampion || event.VictimName}`;
        }
        
        // Add assisters info if relevant
        if (event.AssisterChampions && event.AssisterChampions.length > 0 && event.KillerName === playerName) {
          killText += ` (assisted by ${event.AssisterChampions.join(', ')})`;
        } else if (event.Assisters && event.Assisters.length > 0 && event.VictimName === playerName) {
          const otherAssisters = event.Assisters.filter(name => name !== playerName);
          if (otherAssisters.length > 0) {
            killText += ` (assisted by ${otherAssisters.join(', ')})`;
          }
        }
      } else {
        // Regular tooltip format
        if (event.KillerChampion && event.VictimChampion) {
          killText = `${event.KillerChampion} killed ${event.VictimChampion}`;
          if (event.AssisterChampions && event.AssisterChampions.length > 0) {
            killText += ` (assisted by ${event.AssisterChampions.join(', ')})`;
          }
        } else if (event.KillerName && event.VictimName) {
          // Fallback to summoner names if champion names not available
          killText = `${event.KillerName} killed ${event.VictimName}`;
          if (event.Assisters && event.Assisters.length > 0) {
            killText += ` (assisted by ${event.Assisters.join(', ')})`;
          }
        }
      }
      
      return killText || `Kill @ ${event.EventTime.toFixed(1)}s`;
    }).join('\n');
    
    return `${baseText}\n${killDetails}`;
  }
  
  return baseText;
}
