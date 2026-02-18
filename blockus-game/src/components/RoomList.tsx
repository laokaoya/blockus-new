import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../contexts/RoomContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { GameRoom } from '../types/game';
import soundManager from '../utils/soundManager';

const RoomListContainer = styled.div`
  background: rgba(30, 41, 59, 0.4);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 30px;
  backdrop-filter: blur(12px);
  border: 1px solid var(--surface-border);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '';
    display: block;
    width: 4px;
    height: 24px;
    background: var(--primary-color);
    border-radius: 2px;
    box-shadow: 0 0 10px var(--primary-color);
  }
`;

const CreateRoomButton = styled.button`
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
  }
`;

const RefreshButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  color: var(--primary-color);
  border: 1px solid var(--surface-border);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--primary-color);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
  }
`;

const RoomGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
  
  @media (min-width: 768px) {
    gap: 24px;
    max-height: 450px;
  }
`;

const RoomCard = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 100px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  &:hover {
    border-color: var(--primary-color);
    background: rgba(30, 41, 59, 0.8);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
    transform: translateX(4px);
  }
  
  /* 左侧状态条 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    background: var(--surface-border);
    transition: background 0.3s ease;
  }
  
  &:hover::before {
    background: var(--primary-color);
    box-shadow: 0 0 10px var(--primary-color);
  }
  
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const RoomHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RoomName = styled.h3`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 700;
  flex: 1;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 0 10px ${props => {
    switch (props.status) {
      case 'waiting': return 'rgba(16, 185, 129, 0.1)';
      case 'playing': return 'rgba(245, 158, 11, 0.1)';
      default: return 'transparent';
    }
  }};
`;

const RoomInfo = styled.div`
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: monospace;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
`;

const RoomPlayers = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
`;

const PlayerAvatar = styled.div<{ image?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: white;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    z-index: 10;
  }
`;

const JoinButton = styled.button`
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: rgba(16, 185, 129, 0.2);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: transparent;
    color: var(--text-muted);
    border-color: var(--surface-border);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LockIcon = styled.span`
  margin-left: 8px;
  color: #f59e0b;
  font-size: 0.9em;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
`;

const ScrollHint = styled.div`
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
  border-top: 1px solid var(--surface-border);
  margin-top: 16px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
`;

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string, password?: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreateRoom }) => {
  const { t } = useLanguage();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim(), isPrivate ? password : undefined);
      onClose();
      setRoomName('');
      setPassword('');
      setIsPrivate(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%'
      }}>
                 <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: '600' }}>{t('room.createRoom')}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
                         <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontWeight: '500' }}>
                {t('room.roomName')}
              </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t('room.enterRoomName')}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '10px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              {t('room.setPassword')}
            </label>
          </div>
          
          {isPrivate && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontWeight: '500' }}>
                {t('room.roomPassword')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('room.enterRoomPassword')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                required={isPrivate}
              />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {t('room.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: GameRoom | null;
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, room, password, onPasswordChange, onSubmit }) => {
  const { t } = useLanguage();
  if (!isOpen || !room) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: '600' }}>
          {t('room.joinRoom')}: {room.name}
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontWeight: '500' }}>
            {t('room.roomPassword')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={t('room.enterRoomPassword')}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '10px',
              fontSize: '16px',
              transition: 'border-color 0.3s ease'
            }}
            required
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #6b7280, #4b5563)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            {t('room.join')}
          </button>
        </div>
      </div>
    </div>
  );
};

const SpectateButton = styled.button`
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: auto;
  min-width: 90px;
  
  &:hover {
    background: rgba(245, 158, 11, 0.2);
    transform: translateY(-2px);
  }
`;

const SpectatorCount = styled.span`
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-left: 8px;
`;

const RoomList: React.FC = () => {
  const { rooms, isLoading, refreshRooms, createRoom, joinRoom, spectateGame, isOnline } = useRoom();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [joinPassword, setJoinPassword] = useState('');

  // 自动定时刷新房间列表（每 5 秒）
  React.useEffect(() => {
    if (!isOnline) return;
    refreshRooms();
    const interval = setInterval(() => {
      refreshRooms();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOnline, refreshRooms]);

  const handleCreateRoom = async (name: string, password?: string) => {
    soundManager.buttonClick();
    try {
      const newRoom = await createRoom(name, password);
      if (newRoom) {
        navigate(`/room/${newRoom.id}`);
      }
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('创建房间失败，请重试');
    }
  };

  const handleJoinRoom = (room: GameRoom) => {
    soundManager.buttonClick();
    // 如果房间有密码，显示密码输入模态框
    if (room.password) {
      setSelectedRoom(room);
      setShowJoinModal(true);
    } else {
      // 没有密码，直接加入
      joinRoomDirectly(room);
    }
  };

  const joinRoomDirectly = async (room: GameRoom, password?: string) => {
    try {
      const success = await joinRoom(room.id, password);
      if (success) {
        navigate(`/room/${room.id}`);
      } else {
        alert(password ? '密码错误或加入失败，请重试' : '加入房间失败，请重试');
      }
    } catch (error) {
      console.error('加入房间失败:', error);
      alert('加入房间失败，请重试');
    }
  };

  const handleJoinWithPassword = () => {
    soundManager.buttonClick();
    if (!selectedRoom || !joinPassword.trim()) return;
    setShowJoinModal(false);
    const pw = joinPassword;
    const room = selectedRoom;
    setJoinPassword('');
    setSelectedRoom(null);
    joinRoomDirectly(room, pw);
  };

  const handleSpectate = async (room: GameRoom) => {
    soundManager.buttonClick();
    try {
      const success = await spectateGame(room.id);
      if (success) {
        navigate(`/game?roomId=${room.id}&spectate=true`);
      } else {
        alert('无法观战，请重试');
      }
    } catch (error) {
      console.error('观战失败:', error);
      alert('观战失败，请重试');
    }
  };

  const isUserInRoom = (room: GameRoom) => {
    return room.players.some(p => p.id === user?.profile.id);
  };

  const canJoinRoom = (room: GameRoom) => {
    if (room.status !== 'waiting') return false;
    if (room.players.length >= room.maxPlayers) return false;
    if (isUserInRoom(room)) return false;
    return true;
  };

  const canSpectateRoom = (room: GameRoom) => {
    if (isUserInRoom(room)) return false;
    // 可以观战：游戏进行中，或者等待中但满员（虽然没游戏但可以进入等候）
    return room.status === 'playing';
  };

  const canRejoinRoom = (room: GameRoom) => {
    return isUserInRoom(room) && room.status === 'waiting';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return t('room.status.waiting') || '等待中';
      case 'playing': return t('room.status.playing') || '游戏中';
      case 'finished': return t('room.status.finished') || '已结束';
      default: return t('common.unknown') || '未知';
    }
  };

  const getActionButton = (room: GameRoom) => {
    if (canRejoinRoom(room)) {
      return (
        <JoinButton
          onClick={(e) => {
            e.stopPropagation();
            soundManager.buttonClick();
            navigate(`/room/${room.id}`);
          }}
          onMouseEnter={() => soundManager.buttonHover()}
        >
          进入房间
        </JoinButton>
      );
    }

    if (canJoinRoom(room)) {
      return (
        <JoinButton
          onClick={(e) => {
            e.stopPropagation();
            handleJoinRoom(room);
          }}
          onMouseEnter={() => soundManager.buttonHover()}
        >
          {t('room.join') || '加入'}
        </JoinButton>
      );
    }

    if (canSpectateRoom(room)) {
      return (
        <SpectateButton
          onClick={(e) => {
            e.stopPropagation();
            handleSpectate(room);
          }}
          onMouseEnter={() => soundManager.buttonHover()}
        >
          👁 观战
        </SpectateButton>
      );
    }

    if (room.status === 'waiting' && room.players.length >= room.maxPlayers) {
      return (
        <JoinButton disabled>
          {t('room.full') || '满员'}
        </JoinButton>
      );
    }

    if (room.status === 'finished') {
      return (
        <JoinButton disabled>
          已结束
        </JoinButton>
      );
    }

    return (
      <JoinButton disabled>
        {room.status === 'playing' ? '游戏中' : '不可用'}
      </JoinButton>
    );
  };

  return (
    <RoomListContainer>
      <Header>
        <Title>{t('room.gameRooms')}</Title>
        <div style={{ display: 'flex', gap: '15px' }}>
          <RefreshButton 
            onClick={() => {
              soundManager.buttonClick();
              refreshRooms();
            }}
            onMouseEnter={() => soundManager.buttonHover()}
          >
            {t('common.refresh')}
          </RefreshButton>
          <CreateRoomButton 
            onClick={() => {
              soundManager.buttonClick();
              setShowCreateModal(true);
            }}
            onMouseEnter={() => soundManager.buttonHover()}
          >
            {t('room.createRoom')}
          </CreateRoomButton>
        </div>
      </Header>

      {isLoading ? (
        <LoadingState>{t('common.loading') || '加载中...'}</LoadingState>
      ) : rooms.length === 0 ? (
        <EmptyState>{t('room.noRooms') || '暂无房间，快来创建一个吧！'}</EmptyState>
      ) : null}
      
      <RoomGrid>
        {rooms.map(room => (
          <RoomCard 
            key={room.id}
            onMouseEnter={() => soundManager.buttonHover()}
            onClick={() => {
              if (canRejoinRoom(room)) {
                navigate(`/room/${room.id}`);
              } else if (canJoinRoom(room)) {
                handleJoinRoom(room);
              } else if (canSpectateRoom(room)) {
                handleSpectate(room);
              }
            }}
          >
            <RoomHeader>
              <RoomName>
                {room.name}
                {room.password && <LockIcon>🔒</LockIcon>}
              </RoomName>
              <RoomStatus status={room.status}>
                {getStatusText(room.status)}
              </RoomStatus>
            </RoomHeader>
            
            <RoomInfo>
              <span>ID: {room.id}</span>
              <span>{t('room.host')}: {room.hostId === user?.profile.id ? (t('common.me') || '我') : (room.players.find(p => p.id === room.hostId)?.nickname || t('common.unknown'))}</span>
              <span>
                {t('gameRoom.players')}: {room.players.length}/{room.maxPlayers}
                {room.spectators && room.spectators.length > 0 && (
                  <SpectatorCount>
                    (+{room.spectators.length} 👁)
                  </SpectatorCount>
                )}
              </span>
            </RoomInfo>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <RoomPlayers>
                {room.players.map((player, index) => (
                  <PlayerAvatar 
                    key={player.id} 
                    image={player.avatar}
                    title={player.nickname}
                    style={{ marginLeft: index > 0 ? '-10px' : '0' }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </PlayerAvatar>
                ))}
              </RoomPlayers>
              
              {getActionButton(room)}
            </div>
          </RoomCard>
        ))}
      </RoomGrid>

      <CreateRoomModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreateRoom={handleCreateRoom} 
      />
      
      <JoinRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
        room={selectedRoom}
        password={joinPassword}
        onPasswordChange={setJoinPassword}
        onSubmit={handleJoinWithPassword}
      />
    </RoomListContainer>
  );
};

export default RoomList;