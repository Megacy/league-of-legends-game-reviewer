import { useRef, useState, useEffect } from 'react';
import './App.css';
import type { EventData, TimelineSettings } from './types/electron-api';

// Champion name to ID mapping for Community Dragon API
const CHAMPION_ID_MAP: Record<string, number> = {
  'Jinx': 222, 'Tristana': 18, 'Ashe': 22, 'Thresh': 412, 'Zed': 238, 'Yasuo': 157,
  'Garen': 86, 'Lux': 99, 'Riven': 92, 'Lee Sin': 64, 'Ahri': 103, 'Katarina': 55,
  'Darius': 122, 'Draven': 119, 'Vayne': 67, 'Lucian': 236, 'Ezreal': 81, 'Caitlyn': 51,
  'Miss Fortune': 21, 'Jhin': 202, 'Kai Sa': 145, 'Xayah': 498, 'Aphelios': 523,
  'Samira': 360, 'Viego': 234, 'Gwen': 887, 'Akshan': 166, 'Vex': 711, 'Zeri': 221,
  'Renata Glasc': 888, 'Bel Veth': 200, 'Nilah': 895, 'K Sante': 897, 'Naafiri': 950,
  'Briar': 233, 'Hwei': 910, 'Smolder': 901, 'Aurora': 893, 'Ambessa': 799,
  // Add more champions as needed - these are the most common ones
  'Aatrox': 266, 'Akali': 84, 'Alistar': 12, 'Ammu': 32, 'Anivia': 34, 'Annie': 1,
  'Azir': 268, 'Bard': 432, 'Blitzcrank': 53, 'Brand': 63, 'Braum': 201, 'Camille': 164,
  'Cassiopeia': 69, 'Cho Gath': 31, 'Corki': 42, 'Diana': 131, 'Dr Mundo': 36,
  'Ekko': 245, 'Elise': 60, 'Evelynn': 28, 'Fiddlesticks': 9, 'Fiora': 114, 'Fizz': 105,
  'Galio': 3, 'Gangplank': 41, 'Gragas': 79, 'Graves': 104, 'Hecarim': 120, 'Heimerdinger': 74,
  'Illaoi': 420, 'Irelia': 39, 'Ivern': 427, 'Janna': 40, 'Jarvan IV': 59, 'Jax': 24,
  'Jayce': 126, 'Karthus': 30, 'Kassadin': 38, 'Kennen': 85, 'Kha Zix': 121, 'Kindred': 203,
  'Kled': 240, 'Kog Maw': 96, 'LeBlanc': 7, 'Leona': 89, 'Lissandra': 127, 'Malphite': 54,
  'Malzahar': 90, 'Maokai': 57, 'Master Yi': 11, 'Mordekaiser': 82, 'Morgana': 25,
  'Nami': 267, 'Nasus': 75, 'Nautilus': 111, 'Nidalee': 76, 'Nocturne': 56, 'Nunu': 20,
  'Olaf': 2, 'Orianna': 61, 'Ornn': 516, 'Pantheon': 80, 'Poppy': 78, 'Pyke': 555,
  'Qiyana': 246, 'Quinn': 133, 'Rakan': 497, 'Rammus': 33, 'Rek Sai': 421, 'Renekton': 58,
  'Rengar': 107, 'Rumble': 68, 'Ryze': 13, 'Sejuani': 113, 'Senna': 235, 'Seraphine': 147,
  'Sett': 875, 'Shaco': 35, 'Shen': 98, 'Shyvana': 102, 'Singed': 27, 'Sion': 14,
  'Sivir': 15, 'Skarner': 72, 'Sona': 37, 'Soraka': 16, 'Swain': 50, 'Sylas': 517,
  'Syndra': 134, 'Tahm Kench': 223, 'Taliyah': 163, 'Talon': 91, 'Taric': 44, 'Teemo': 17,
  'Twisted Fate': 4, 'Twitch': 29, 'Udyr': 77, 'Urgot': 6, 'Varus': 110, 'Vel Koz': 161,
  'Vi': 254, 'Viktor': 112, 'Vladimir': 8, 'Volibear': 106, 'Warwick': 19, 'Wukong': 62,
  'Xin Zhao': 5, 'Yorick': 83, 'Yuumi': 350, 'Zac': 154, 'Ziggs': 115, 'Zilean': 26,
  'Zoe': 142, 'Zyra': 143,
  // Additional missing champions based on user feedback
  'Aurelion Sol': 136, 'AurelionSol': 136, 'Yunara': 804 // Yunara is a new champion (2025)
};

// Function to get champion icon URL
function getChampionIconUrl(championName: string): string {
  // Handle common name variations and clean up the name
  const cleanName = championName.replace(/'/g, '').replace(/\s+/g, ' ').trim();
  
  // Handle specific name mappings for champions with special characters or variations
  const nameMap: Record<string, string> = {
    'KaiSa': 'Kai Sa',
    'Kai Sa': 'Kai Sa',
    'LeBlanc': 'LeBlanc',
    'Cho Gath': 'Cho Gath',
    'Dr. Mundo': 'Dr Mundo',
    'Jarvan IV': 'Jarvan IV',
    'Kha Zix': 'Kha Zix',
    'Kog Maw': 'Kog Maw',
    'Lee Sin': 'Lee Sin',
    'Master Yi': 'Master Yi',
    'Miss Fortune': 'Miss Fortune',
    'Rek Sai': 'Rek Sai',
    'Tahm Kench': 'Tahm Kench',
    'Twisted Fate': 'Twisted Fate',
    'Vel Koz': 'Vel Koz',
    'Xin Zhao': 'Xin Zhao',
    'Renata Glasc': 'Renata Glasc',
    'Bel Veth': 'Bel Veth',
    'K Sante': 'K Sante',
    // Handle specific champion name variations
    'Aurelian Sol': 'Aurelion Sol',
    'AurelianSol': 'Aurelion Sol',
    'Yunara': 'Yunara' // New champion (2025) - separate from Yuumi
  };
  
  const mappedName = nameMap[cleanName] || cleanName;
  const championId = CHAMPION_ID_MAP[mappedName];
  
  if (championId) {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
  }
  
  // If champion not found, try a fallback - use question mark icon or similar
  console.warn(`Champion not found in mapping: "${championName}" (cleaned: "${cleanName}", mapped: "${mappedName}")`);
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/0.png`;
}

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

// Helper function to check if an event is related to player's KDA
function isPlayerKDAEvent(event: EventData, playerName: string): boolean {
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
function getKDAIcon(event: EventData, playerName: string): string {
  if (event.VictimName === playerName) {
    return '💀'; // Death (skull icon)
  } else if (event.KillerName === playerName) {
    return '⚔️'; // Kill
  } else if (event.Assisters && event.Assisters.includes(playerName)) {
    return '🤝'; // Assist
  }
  return '⚔️'; // Default
}

// Helper function to calculate timing offset between game time and video time
function calculateGameTimeOffset(events: EventData[]): number {
  // The key insight: League API EventTime is game time (0 = game start)
  // But video recording starts during loading screen, which can be 60-120+ seconds
  // We need to find when the game actually started in the video timeline
  
  // Find GameStart and MinionsSpawning events for reference
  const gameStartEvent = events.find(e => e.EventName === 'GameStart');
  const minionsEvent = events.find(e => e.EventName === 'MinionsSpawning');
  
  // Strategy 1: Use MinionsSpawning as a more reliable reference
  // Minions spawn at exactly 1:05 (65 seconds) game time in all games
  if (minionsEvent && minionsEvent.EventTime) {
    // If minions spawn at 65.03s game time, and we know this should be 65s,
    // then the actual game start was at minions_time - 65
    const actualGameStartInGameTime = minionsEvent.EventTime - 65;
    console.log('[Timeline] Using MinionsSpawning reference - EventTime:', minionsEvent.EventTime, 'Calculated game start offset:', actualGameStartInGameTime);
    
    // The offset to add to game times to get video times
    // If game actually started at 90s into the recording, then we need to add 90s to all game times
    // But we don't know the exact video start time, so we use a heuristic
    
    // Conservative estimate: assume recording started 60-90s before game start
    // This means game events need to be shifted forward by this amount
    const estimatedLoadingTime = 75; // seconds, adjust based on typical loading times
    return -estimatedLoadingTime; // Negative because we subtract this from game time, effectively adding to video time
  }
  
  // Strategy 2: Use GameStart if available, but with loading time estimate
  if (gameStartEvent && gameStartEvent.EventTime !== undefined) {
    console.log('[Timeline] Using GameStart reference - EventTime:', gameStartEvent.EventTime);
    // Estimate that recording started 75 seconds before game start
    const estimatedLoadingTime = 75;
    return gameStartEvent.EventTime - estimatedLoadingTime; // This will be negative, which is correct
  }
  
  // Strategy 3: Fallback - assume first significant event happened after loading + game time
  const significantEvents = events.filter(e => 
    e.EventTime && e.EventTime > 30 && // Ignore very early events
    !['GameStart', 'MinionsSpawning'].includes(e.EventName)
  );
  
  if (significantEvents.length > 0) {
    const firstEventTime = Math.min(...significantEvents.map(e => e.EventTime));
    // Assume this event happened at firstEventTime + loadingTime in the video
    const estimatedLoadingTime = 75;
    const calculatedOffset = -estimatedLoadingTime;
    console.log('[Timeline] Using fallback - first significant event at:', firstEventTime, 'estimated offset:', calculatedOffset);
    return calculatedOffset;
  }
  
  console.log('[Timeline] No timing reference found, using 0 offset');
  return 0;
}

// Helper function to group events within 10 seconds
interface GroupedEvent {
  eventType: string;
  events: EventData[];
  startTime: number;
  count: number;
  icon: string;
}

function groupEvents(events: EventData[], visibleTypes: string[], showOnlyMyKDA: boolean = false, playerName: string = '', gameTimeOffset: number = 0): GroupedEvent[] {
  let filteredEvents = events.filter(e => visibleTypes.includes(e.EventName));
  
  // Additional filtering for KDA events if enabled
  if (showOnlyMyKDA && playerName) {
    filteredEvents = filteredEvents.filter(e => isPlayerKDAEvent(e, playerName));
  }
  
  const groups: GroupedEvent[] = [];
  const groupWindow = 20; // 20 seconds grouping window
  
  // Sort events by time
  const sortedEvents = [...filteredEvents].sort((a, b) => a.EventTime - b.EventTime);
  
  for (const event of sortedEvents) {
    // Apply offset to event time for comparison
    // Note: offset might be negative (loading time), so we subtract it to add time
    const adjustedEventTime = Math.max(0, event.EventTime - gameTimeOffset);
    
    // Try to find an existing group for this event type within the time window
    const existingGroup = groups.find(group => 
      group.eventType === event.EventName && 
      Math.abs(adjustedEventTime - group.startTime) <= groupWindow
    );
    
    if (existingGroup) {
      // Add to existing group
      existingGroup.events.push(event);
      existingGroup.count = existingGroup.events.length;
      // Update start time to be the earliest in the group (already adjusted)
      existingGroup.startTime = Math.min(existingGroup.startTime, adjustedEventTime);
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
        startTime: adjustedEventTime, // Use the pre-calculated adjusted time
        count: 1,
        icon
      });
    }
  }
  
  return groups.sort((a, b) => a.startTime - b.startTime);
}

// Helper function to generate enhanced tooltips for grouped events
function generateTooltip(group: GroupedEvent, showOnlyMyKDA: boolean = false, playerName: string = ''): string {
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

// Visual Tooltip Component for Champion Kill Events
function ChampionKillTooltip({ group, showKDA, playerName, x, y }: {
  group: GroupedEvent;
  showKDA: boolean;
  playerName: string;
  x: number;
  y: number;
}) {
  if (group.eventType !== 'ChampionKill' || group.events.length === 0) {
    // Fallback to text tooltip for non-champion events
    return (
      <div style={{
        position: 'fixed',
        left: x - 100,
        top: y - 80,
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        whiteSpace: 'pre-line',
        zIndex: 1000,
        pointerEvents: 'none',
        maxWidth: 200
      }}>
        {generateTooltip(group, showKDA, playerName)}
      </div>
    );
  }

  // Helper function to render a single kill horizontally
  const renderSingleKill = (event: EventData, index: number = 0) => {
    const killerChampion = event.KillerChampion || event.KillerName || 'Unknown';
    const victimChampion = event.VictimChampion || event.VictimName || 'Unknown';

    // Determine kill type for KDA mode
    let killType = 'kill';
    let killIcon = '⚔️';
    let leftChampion = killerChampion;
    let rightChampion = victimChampion;
    
    if (showKDA && playerName) {
      if (event.VictimName === playerName) {
        killType = 'death';
        killIcon = '💀';
        // For deaths, show killer -> player (victim)
        leftChampion = killerChampion;
        rightChampion = victimChampion;
      } else if (event.Assisters && event.Assisters.includes(playerName)) {
        killType = 'assist';
        killIcon = '🤝';
        // For assists, show player's champion -> victim
        // Find the player's champion from the AssisterChampions array
        if (event.AssisterChampions && event.Assisters) {
          const playerIndex = event.Assisters.indexOf(playerName);
          if (playerIndex >= 0 && playerIndex < event.AssisterChampions.length) {
            leftChampion = event.AssisterChampions[playerIndex]; // Player's champion
          } else {
            leftChampion = 'YOU'; // Fallback if champion not found
          }
        } else {
          leftChampion = 'YOU'; // Fallback if no champion data
        }
        rightChampion = victimChampion; // Show who died
      }
    }

    // In KDA mode, show assists only if the player is actually assisting this kill
    if (showKDA && killType === 'assist') {
      if (!(event.Assisters && event.Assisters.includes(playerName))) {
        return null;
      }
    }

    return (
      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 44 }}>
        {/* Killer champion */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 50 }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 4,
            border: killType === 'kill' && showKDA ? '2px solid #00ff88' : killType === 'assist' && showKDA ? '2px solid #ffd700' : '1px solid #666',
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {leftChampion === 'ASSIST' || leftChampion === 'YOU' ? (
              <span style={{ 
                color: '#ffd700', 
                fontSize: '12px', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                🤝
              </span>
            ) : (
              <img 
                src={getChampionIconUrl(leftChampion)} 
                alt={leftChampion}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Show champion name initial as fallback
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = leftChampion.charAt(0);
                    parent.style.color = '#fff';
                    parent.style.fontSize = '12px';
                    parent.style.fontWeight = 'bold';
                  }
                }}
              />
            )}
          </div>
          <span style={{ 
            fontSize: 9, 
            color: killType === 'kill' && showKDA ? '#00ff88' : killType === 'assist' && showKDA ? '#ffd700' : '#fff',
            fontWeight: (killType === 'kill' || killType === 'assist') && showKDA ? 'bold' : 'normal',
            maxWidth: 50,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {leftChampion === 'ASSIST' || leftChampion === 'YOU' ? 'YOU' : leftChampion}
          </span>
        </div>
        
        {/* Kill icon */}
        <div style={{ 
          fontSize: 14, 
          color: killType === 'death' ? '#ff6b35' : killType === 'assist' ? '#ffd700' : '#00ff88',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 32,
          minWidth: 20
        }}>
          {killIcon}
        </div>
        
        {/* Victim champion */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 50 }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 4,
            border: killType === 'death' && showKDA ? '2px solid #ff6b35' : '1px solid #666',
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img 
              src={getChampionIconUrl(rightChampion)} 
              alt={rightChampion}
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Show champion name initial as fallback
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = rightChampion.charAt(0);
                  parent.style.color = '#fff';
                  parent.style.fontSize = '12px';
                  parent.style.fontWeight = 'bold';
                }
              }}
            />
          </div>
          <span style={{ 
            fontSize: 9, 
            color: killType === 'death' && showKDA ? '#ff6b35' : '#fff',
            fontWeight: killType === 'death' && showKDA ? 'bold' : 'normal',
            maxWidth: 50,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {rightChampion}
          </span>
        </div>
      </div>
    );
  };

  // Calculate dynamic height based on number of events
  const visibleEventsCount = group.events.filter(event => {
    const killType = showKDA && playerName ? (
      event.VictimName === playerName ? 'death' :
      event.Assisters && event.Assisters.includes(playerName) ? 'assist' : 'kill'
    ) : 'kill';
    
    // In KDA mode, skip assists that aren't from the player
    if (showKDA && killType === 'assist') {
      return event.Assisters && event.Assisters.includes(playerName);
    }
    return true;
  }).length;
  
  // Calculate dynamic offset: base (120px) + extra per row (50px each)
  const baseOffset = 120;
  const extraOffset = Math.max(0, (visibleEventsCount - 1) * 50);
  const dynamicOffset = baseOffset + extraOffset;

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(x - 75, window.innerWidth - 200), // Center horizontally on the icon
      top: Math.max(y - dynamicOffset, 10), // Dynamic positioning based on content height
      background: 'rgba(35, 41, 70, 0.95)',
      border: '1px solid #444',
      borderRadius: 8,
      padding: '12px',
      zIndex: 1000,
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      minWidth: 150,
      transform: 'translateX(0)' // Remove any centering transform
    }}>
      {/* Time and event type */}
      <div style={{ 
        textAlign: 'center', 
        color: '#aaa', 
        fontSize: 11, 
        marginBottom: 8,
        fontWeight: 500
      }}>
        {group.events.length > 1 ? `${group.events.length}x ` : ''}{EVENT_TYPE_LABELS[group.eventType]} @ {group.startTime.toFixed(1)}s
      </div>
      
      {/* Render all kills vertically (filter out assists in KDA mode) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.events.map((event, index) => renderSingleKill(event, index)).filter(Boolean)}
      </div>
    </div>
  );
}

// Custom tooltip component for various event types
function CustomEventTooltip({ group, x, y }: {
  group: GroupedEvent;
  x: number;
  y: number;
}) {
  const event = group.events[0]; // Use first event for tooltip data
  
  let tooltipContent = '';
  const iconEmoji = group.icon;

  switch (event.EventName) {
    case 'TurretKilled':
      tooltipContent = `Turret destroyed at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'DragonKill':
      tooltipContent = `Dragon slain at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'BaronKill':
      tooltipContent = `Baron slain at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'FirstBlood':
      tooltipContent = `First Blood at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'Ace':
      tooltipContent = `Team Ace at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'InhibKilled':
      tooltipContent = `Inhibitor destroyed at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'HeraldKill':
      tooltipContent = `Herald slain at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'Multikill':
      tooltipContent = `Multikill at ${event.EventTime.toFixed(1)}s`;
      break;
    case 'AtakhanKill':
      tooltipContent = `Atakhan slain at ${event.EventTime.toFixed(1)}s`;
      break;
    default:
      tooltipContent = `${event.EventName} at ${event.EventTime.toFixed(1)}s`;
  }

  return (
    <div style={{
      position: 'fixed',
      left: x - 100, // Center horizontally on the icon
      top: y - 40, // Position closer to timeline icons but still clear
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '6px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 'bold',
      zIndex: 10000,
      border: '1px solid #555',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
      pointerEvents: 'none',
      maxWidth: 180,
      textAlign: 'center',
      transform: 'translateX(0)' // Remove the centering transform
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <span style={{ fontSize: 16 }}>{iconEmoji}</span>
        <span>{tooltipContent}</span>
      </div>
    </div>
  );
}

export default function VideoReview({ setCurrentFilename, latestFile }: { setCurrentFilename?: (filename: string) => void, latestFile?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [events, setEvents] = useState<EventData[]>([]);
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
        if (Array.isArray(loaded)) {
          // Old format - just events array
          events = loaded;
          storedPlayerName = null;
        } else if (loaded && typeof loaded === 'object' && 'events' in loaded) {
          // New format with metadata
          events = loaded.events;
          storedPlayerName = loaded.activePlayerName || null;
        } else {
          events = [];
          storedPlayerName = null;
        }
        
        const normalized = Array.isArray(events)
          ? events.map((e, idx) => ({ ...e, EventID: typeof e.EventID === 'number' ? e.EventID : Number(e.EventID) || idx }))
          : [];
        console.log('[VideoReview] Setting events state:', normalized);
        setEvents(normalized);
        
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
                const gameTimeOffset = manualTimingOffset !== 0 ? manualTimingOffset : calculateGameTimeOffset(events);
                const groupedEvents = groupEvents(events, visibleTypes, showOnlyMyKDA, playerName, gameTimeOffset);
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
                    <>Auto timing offset: {calculateGameTimeOffset(events).toFixed(2)}s 
                    {calculateGameTimeOffset(events) < 0 ? ' (adding loading time)' : ' (subtracting from game time)'}</>
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
                          Current: {manualTimingOffset !== 0 ? `Manual (${manualTimingOffset}s)` : `Auto (${calculateGameTimeOffset(events).toFixed(1)}s)`}
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
