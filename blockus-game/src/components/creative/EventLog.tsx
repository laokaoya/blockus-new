import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { GameEvent } from '../../types/creative';
import { PlayerColor } from '../../types/game';
import { useLanguage } from '../../contexts/LanguageContext';
import { HistoryIcon } from '../Icons';

const COLOR_MAP: Record<PlayerColor, string> = {
  red: '#f87171',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  green: '#4ade80',
};

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  position: relative;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ToggleBtn = styled.button<{ $hasNew: boolean; $active: boolean }>`
  background: var(--surface-highlight);
  color: ${props => props.$hasNew ? '#fbbf24' : 'var(--text-primary)'};
  border: 1px solid var(--surface-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--surface-border);
  }
  
  ${props => props.$active && css`
    background: var(--surface-border);
    border-color: var(--primary-color);
  `}
`;

const Badge = styled.span`
  background: #f87171;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -2px;
  right: -2px;
  border: 2px solid var(--surface-color);
`;

const HistoryLabel = styled.span`
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  @media (max-width: 768px) { display: none; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 400px;
  max-height: 480px;
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: ${slideIn} 0.2s ease-out;
  
  @media (max-width: 768px) {
    width: 260px;
    max-height: 50vh;
  }
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface-highlight);
`;

const EventList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--surface-border); border-radius: 4px; }
`;

const EventItem = styled.div<{ $isNew?: boolean }>`
  padding: 8px 10px;
  border-bottom: 1px solid var(--surface-border);
  ${props => props.$isNew && css`animation: ${slideIn} 0.3s ease-out;`}
  
  &:last-child { border-bottom: none; }
  &:hover { background: var(--surface-highlight); border-radius: 6px; }
`;

const EventHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

const EventIcon = styled.span`
  font-size: 14px;
  line-height: 1;
`;

const PlayerName = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$color};
`;

const EventTime = styled.span`
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
`;

const EventMsg = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: 20px;
`;

const ScoreChange = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  font-size: 11px;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  margin-left: 4px;
`;

const EventDetail = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  margin-left: 4px;
  display: block;
  margin-top: 2px;
`;

const EmptyHint = styled.div`
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 30px 0;
`;

interface EventLogProps {
  events: GameEvent[];
}

const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = events.filter(e => e.id > lastSeenId).length;

  const toggleExpand = useCallback(() => {
    setExpanded(prev => {
      if (!prev) {
        setLastSeenId(events[0]?.id ?? 0);
        setSeenCount(events.length);
      }
      return !prev;
    });
  }, [events]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length, expanded]);

  useEffect(() => {
    if (expanded && events.length > 0) {
      setLastSeenId(events[0].id);
      setSeenCount(events.length);
    }
  }, [expanded, events]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <Container ref={containerRef}>
      <HistoryLabel>{t('creative.eventLog') || '历史记录'}</HistoryLabel>
      <ToggleBtn 
        onClick={toggleExpand} 
        $hasNew={!expanded && unread > 0}
        $active={expanded}
        title={t('creative.eventLog') || '历史记录'}
      >
        <HistoryIcon />
        {!expanded && unread > 0 && <Badge>{unread > 9 ? '9+' : unread}</Badge>}
      </ToggleBtn>

      {expanded && (
        <Dropdown>
          <DropdownHeader>
            {t('creative.eventLog') || '历史记录'}
          </DropdownHeader>
          <EventList ref={listRef}>
            {events.length === 0 ? (
              <EmptyHint>{t('creative.noEvents') || '暂无记录'}</EmptyHint>
            ) : (
              events.map((ev, idx) => (
                <EventItem key={ev.id} $isNew={idx < events.length - seenCount}>
                  <EventHeader>
                    <EventIcon>{ev.icon || '•'}</EventIcon>
                    <PlayerName $color={COLOR_MAP[ev.playerColor] || 'var(--text-secondary)'}>{ev.playerName}</PlayerName>
                    <EventTime>{formatTime(ev.timestamp)}</EventTime>
                  </EventHeader>
                  <EventMsg>
                    {ev.message}
                    {ev.scoreChange !== undefined && ev.scoreChange !== 0 && (
                      <ScoreChange $positive={ev.scoreChange > 0}>
                        {ev.scoreChange > 0 ? `+${ev.scoreChange}` : ev.scoreChange}
                      </ScoreChange>
                    )}
                    {ev.detail && <EventDetail>({ev.detail})</EventDetail>}
                  </EventMsg>
                </EventItem>
              ))
            )}
          </EventList>
        </Dropdown>
      )}
    </Container>
  );
};

export default EventLog;
