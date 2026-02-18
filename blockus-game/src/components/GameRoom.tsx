import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useRoom } from '../contexts/RoomContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import socketService from '../services/socketService';
import soundManager from '../utils/soundManager';

const RoomContainer = styled.div`
  height: 100vh;
  padding: 20px;
  overflow-y: auto;
  background: radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.3) 0%, transparent 70%);
  
  @media (min-width: 768px) {
    padding: 40px;
  }
`;

const RoomCard = styled.div`
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
  max-width: 1000px;
  margin: 0 auto;
  margin-bottom: 40px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
  }
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--surface-border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
`;

const RoomInfo = styled.div`
  flex: 1;
`;

const RoomName = styled.h1`
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
  font-family: 'Rajdhani', sans-serif;
`;

const RoomMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  color: var(--text-secondary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
`;

const RoomStatus = styled.span<{ status: string }>`
  background: ${props => {
    switch (props.status) {
      case 'waiting': return 'rgba(16, 185, 129, 0.1)';
      case 'playing': return 'rgba(245, 158, 11, 0.1)';
      case 'finished': return 'rgba(100, 116, 139, 0.1)';
      default: return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'waiting': return '#10b981';
      case 'playing': return '#f59e0b';
      case 'finished': return '#94a3b8';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'waiting': return 'rgba(16, 185, 129, 0.3)';
      case 'playing': return 'rgba(245, 158, 11, 0.3)';
      case 'finished': return 'rgba(100, 116, 139, 0.3)';
      default: return 'rgba(100, 116, 139, 0.3)';
    }
  }};
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;

const PlayersSection = styled.div`
  background: rgba(15, 23, 42, 0.3);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--surface-border);
`;

const SectionTitle = styled.h2`
  color: var(--text-primary);
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  border-left: 3px solid var(--primary-color);
  padding-left: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Orbitron', sans-serif;
`;

const PlayersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
`;

const PlayerCard = styled.div<{ $isCurrentUser: boolean; $isHost: boolean }>`
  background: ${props => props.$isCurrentUser ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${props => props.$isCurrentUser ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const PlayerAvatar = styled.div<{ image?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: white;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
`;

const PlayerName = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HostBadge = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 0.6rem;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-weight: 700;
`;

const PlayerStatusBadge = styled.div<{ $isReady: boolean }>`
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${props => props.$isReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
  color: ${props => props.$isReady ? '#10b981' : '#f59e0b'};
  border: 1px solid ${props => props.$isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'};
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ControlPanel = styled.div`
  background: rgba(15, 23, 42, 0.3);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const AIControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AISelect = styled.select`
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: 'Rajdhani', sans-serif;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  option {
    background: #1e293b;
  }
`;

const AddAIButton = styled.button`
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: rgba(16, 185, 129, 0.2);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    border-color: var(--surface-border);
    cursor: not-allowed;
    transform: none;
  }
`;

const StartGameButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 10px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    background: var(--surface-border);
  }
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  border: 1px solid var(--surface-border);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const LoadingContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--text-primary);
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--surface-border);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const GameRoom: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { currentRoom, leaveRoom, startGame, addAI, rooms, refreshRooms } = useRoom();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedAIDifficulty, setSelectedAIDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isLoading, setIsLoading] = useState(true);
  
  const roomId = params.roomId;
  const targetRoom = currentRoom || (roomId ? rooms.find(r => r.id === roomId) : null);

  useEffect(() => {
    const unsubscribe = socketService.on('game:started', (data: { roomId: string }) => {
      if (data.roomId === params.roomId || data.roomId === currentRoom?.id) {
        navigate(`/game?roomId=${data.roomId}`, { state: { showTransition: true } });
      }
    });
    return () => unsubscribe();
  }, [params.roomId, currentRoom?.id, navigate]);

  useEffect(() => {
    if (targetRoom && user) {
      setIsLoading(false);
      return;
    }

    if (!targetRoom && roomId) {
      refreshRooms();
    }

    const timeout = setTimeout(() => {
      if (!targetRoom || !user) {
        console.log('房间或用户不存在，重定向到首页');
        navigate('/', { replace: true });
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [targetRoom, user, roomId, navigate, refreshRooms]);

  if (isLoading || !targetRoom || !user) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <div>{t('common.loading') || '加载中...'}</div>
      </LoadingContainer>
    );
  }

  const isHost = targetRoom.hostId === user.profile.id;
  const canStartGame = targetRoom.players.length >= 2 && targetRoom.players.length <= 4;
  const canAddAI = targetRoom.players.length < 4;

  const handleLeaveRoom = () => {
    soundManager.buttonClick();
    leaveRoom();
    navigate('/');
  };

  const handleAddAI = async () => {
    soundManager.buttonClick();
    await addAI(targetRoom.id, selectedAIDifficulty);
  };

  const handleStartGame = async () => {
    soundManager.buttonClick();
    if (canStartGame) {
      try {
        const success = await startGame(targetRoom.id);
        if (success) {
          navigate(`/game?roomId=${targetRoom.id}`, { state: { showTransition: true } });
        } else {
          alert(t('gameRoom.startFailed') || '开始游戏失败，请确认所有玩家已准备');
        }
      } catch (error) {
        console.error('开始游戏出错:', error);
        alert(t('gameRoom.startFailed') || '开始游戏失败，请重试');
      }
    }
  };

  return (
    <RoomContainer>
      <BackButton 
        onClick={handleLeaveRoom}
        onMouseEnter={() => soundManager.buttonHover()}
      >
        ← {t('gameRoom.leaveRoom')}
      </BackButton>
      
      <RoomCard>
        <Header>
          <RoomInfo>
            <RoomName>{targetRoom.name}</RoomName>
            <RoomMeta>
              <span>ID: {targetRoom.id}</span>
              <RoomStatus status={targetRoom.status}>
                {targetRoom.status === 'waiting' ? t('room.status.waiting') : 
                 targetRoom.status === 'playing' ? t('room.status.playing') : 
                 t('room.status.finished')}
              </RoomStatus>
            </RoomMeta>
          </RoomInfo>
        </Header>

        <Content>
          <PlayersSection>
            <SectionTitle>
              {t('gameRoom.players')} ({targetRoom.players.length}/{targetRoom.maxPlayers})
            </SectionTitle>
            <PlayersGrid>
              {targetRoom.players.map(player => (
                <PlayerCard 
                  key={player.id} 
                  $isCurrentUser={player.id === user.profile.id}
                  $isHost={player.isHost}
                >
                  {player.isHost && <HostBadge>{t('gameRoom.host')}</HostBadge>}
                  <PlayerHeader>
                    <PlayerAvatar image={player.avatar}>
                      {!player.avatar && player.nickname.charAt(0).toUpperCase()}
                    </PlayerAvatar>
                    <div style={{ overflow: 'hidden' }}>
                      <PlayerName>{player.nickname}</PlayerName>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {player.isAI ? t('room.aiPlayer') : t('player.human')}
                      </div>
                    </div>
                  </PlayerHeader>
                  <PlayerStatusBadge $isReady={player.isReady}>
                    {player.isReady ? t('room.ready') || t('gameRoom.ready') : t('room.waiting') || t('gameRoom.notReady')}
                  </PlayerStatusBadge>
                </PlayerCard>
              ))}
            </PlayersGrid>
          </PlayersSection>
          
          <Sidebar>
            <ControlPanel>
              <SectionTitle>{t('gameRoom.addAIPlayer')}</SectionTitle>
              <AIControls>
                <AISelect
                  value={selectedAIDifficulty}
                  onChange={(e) => setSelectedAIDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  onMouseEnter={() => soundManager.buttonHover()}
                >
                  <option value="easy">{t('settings.easy')}</option>
                  <option value="medium">{t('settings.medium')}</option>
                  <option value="hard">{t('settings.hard')}</option>
                </AISelect>
                <AddAIButton 
                  onClick={handleAddAI} 
                  disabled={!canAddAI}
                  onMouseEnter={() => soundManager.buttonHover()}
                >
                  {canAddAI ? t('gameRoom.addAI') : t('gameRoom.roomFull')}
                </AddAIButton>
              </AIControls>
            </ControlPanel>

            {isHost && (
              <StartGameButton 
                onClick={handleStartGame}
                disabled={!canStartGame}
                onMouseEnter={() => soundManager.buttonHover()}
              >
                {canStartGame ? t('gameRoom.startGame') : t('gameRoom.waitingForPlayers')}
              </StartGameButton>
            )}
          </Sidebar>
        </Content>
      </RoomCard>
    </RoomContainer>
  );
};

export default GameRoom;