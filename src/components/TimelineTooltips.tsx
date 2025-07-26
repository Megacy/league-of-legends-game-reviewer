import type { EventData } from '../types/electron-api';
import { getChampionIconUrl } from './ChampionUtils';
import type { GroupedEvent } from './TimelineUtils';
import { EVENT_TYPE_LABELS, generateTooltip } from './TimelineUtils';

interface ChampionKillTooltipProps {
  group: GroupedEvent;
  showKDA: boolean;
  playerName: string;
  x: number;
  y: number;
}

export function ChampionKillTooltip({ group, showKDA, playerName, x, y }: ChampionKillTooltipProps) {
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
        {/* Left champion (killer or player for assists) */}
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
        
        {/* Right champion (victim) */}
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

interface CustomEventTooltipProps {
  group: GroupedEvent;
  x: number;
  y: number;
}

export function CustomEventTooltip({ group, x, y }: CustomEventTooltipProps) {
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
