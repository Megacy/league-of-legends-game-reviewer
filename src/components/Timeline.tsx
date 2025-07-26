import { useState } from 'react';
import type { EventData } from '../types/electron-api';
import type { GroupedEvent } from './TimelineUtils';
import { groupEvents, DEFAULT_VISIBLE } from './TimelineUtils';
import { ChampionKillTooltip, CustomEventTooltip } from './TimelineTooltips';

interface TimelineProps {
  events: EventData[];
  duration: number;
  currentTime: number;
  onSeekTo: (time: number) => void;
  showKDA: boolean;
  selectedPlayer: string;
  eventFilter: string;
}

export function Timeline({ 
  events, 
  duration, 
  currentTime, 
  onSeekTo, 
  showKDA, 
  selectedPlayer, 
  eventFilter 
}: TimelineProps) {
  const [hoveredGroup, setHoveredGroup] = useState<GroupedEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!duration || duration <= 0) {
    return (
      <div style={{ 
        height: 60, 
        background: 'linear-gradient(135deg, #1e293b, #334155)', 
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: 14
      }}>
        Video loading...
      </div>
    );
  }

  const visibleTypes = eventFilter === 'all' ? DEFAULT_VISIBLE : [eventFilter];
  const filteredEvents = groupEvents(events, visibleTypes, showKDA, selectedPlayer, 0);

  const handleIconMouseEnter = (group: GroupedEvent, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setHoveredGroup(group);
  };

  const handleIconMouseLeave = () => {
    setHoveredGroup(null);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickedTime = (clickX / timelineWidth) * duration;
    onSeekTo(clickedTime);
  };

  // Calculate current time indicator position
  const currentTimePercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div>
      <div 
        style={{ 
          position: 'relative',
          height: 60, 
          background: 'linear-gradient(135deg, #1e293b, #334155)', 
          borderRadius: 8,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid #475569'
        }}
        onClick={handleTimelineClick}
      >
        {/* Current time indicator */}
        <div
          style={{
            position: 'absolute',
            left: `${currentTimePercent}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: '#ef4444',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        />
        
        {/* Current time indicator dot */}
        <div
          style={{
            position: 'absolute',
            left: `${currentTimePercent}%`,
            top: '50%',
            width: 8,
            height: 8,
            background: '#ef4444',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 11,
            pointerEvents: 'none',
            border: '1px solid #fff'
          }}
        />

        {/* Event icons */}
        {filteredEvents.map((group: GroupedEvent, index: number) => {
          if (group.events.length === 0) return null;
          
          const timePercent = duration > 0 ? (group.startTime / duration) * 100 : 0;
          
          return (
            <div
              key={`${group.eventType}-${group.startTime}-${index}`}
              style={{
                position: 'absolute',
                left: `${timePercent}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 5,
                fontSize: group.eventType === 'ChampionKill' ? 18 : 16,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={(e) => handleIconMouseEnter(group, e)}
              onMouseLeave={handleIconMouseLeave}
              onClick={(e) => {
                e.stopPropagation();
                onSeekTo(group.startTime);
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1.2)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1)';
              }}
            >
              {group.icon}
              {group.events.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #fff'
                }}>
                  {group.events.length}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Render tooltip */}
      {hoveredGroup && (
        hoveredGroup.eventType === 'ChampionKill' ? (
          <ChampionKillTooltip
            group={hoveredGroup}
            showKDA={showKDA}
            playerName={selectedPlayer}
            x={tooltipPosition.x}
            y={tooltipPosition.y}
          />
        ) : (
          <CustomEventTooltip
            group={hoveredGroup}
            x={tooltipPosition.x}
            y={tooltipPosition.y}
          />
        )
      )}
    </div>
  );
}
