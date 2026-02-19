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
  overflow: visible;
  
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

const CreateRoomPanel = styled.div<{ isOpen: boolean }>`
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  max-height: ${props => props.isOpen ? '300px' : '0'};
  transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
  opacity: ${props => props.isOpen ? 1 : 0};
  margin-bottom: ${props => props.isOpen ? '20px' : '0'};
  border-radius: 16px;
  border: ${props => props.isOpen ? '1px solid rgba(99, 102, 241, 0.3)' : 'none'};
  box-shadow: ${props => props.isOpen ? '0 0 30px rgba(99, 102, 241, 0.15)' : 'none'};
`;

const PanelContent = styled.div`
  padding: 24px;
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 20px;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const PanelInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PanelLabel = styled.label`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: 'Rajdhani', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
`;

const PanelInput = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-family: 'Rajdhani', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 1.1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
    background: rgba(0, 0, 0, 0.5);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

const PanelButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'Orbitron', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-transform: uppercase;
  letter-spacing: 1px;
  height: 48px;

  ${props => props.variant === 'primary' ? `
    background: var(--primary-gradient);
    color: white;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  `}
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
`;

const ToggleSwitch = styled.div<{ checked: boolean }>`
  width: 40px;
  height: 20px;
  background: ${props => props.checked ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  position: relative;
  transition: all 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    left: ${props => props.checked ? '22px' : '2px'};
    top: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transform: translateY(0);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const ModalHeader = styled.div`
  margin-bottom: 24px;
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(to right, #fff, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  font-family: 'Rajdhani', sans-serif;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.5px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2), 0 0 15px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const CheckboxGroup = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.95rem;
  user-select: none;
  margin-bottom: 20px;
  
  &:hover {
    color: white;
  }
`;

const Checkbox = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;

  &:checked {
    background: var(--primary-color);
    border-color: var(--primary-color);
  }

  &:checked::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 14px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
  }
  
  &:hover {
    border-color: var(--primary-color);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 1px;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;

  ${props => props.variant === 'primary' ? `
    background: var(--primary-gradient);
    color: white;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(99, 102, 241, 0.6);
      filter: brightness(1.1);
    }
    
    &:active {
      transform: translateY(0);
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
    }
  `}
`;


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
    <ModalOverlay isOpen={isOpen} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            {t('room.joinRoom')}: {room.name}
          </ModalTitle>
        </ModalHeader>
        
        <FormGroup>
          <Label>{t('room.roomPassword')}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={t('room.enterRoomPassword')}
            required
            autoFocus
          />
        </FormGroup>
        
        <ButtonGroup>
          <ModalButton type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </ModalButton>
          <ModalButton type="button" variant="primary" onClick={onSubmit}>
            {t('room.join')}
          </ModalButton>
        </ButtonGroup>
      </ModalContainer>
    </ModalOverlay>
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
  
  // Create Room State
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isNewRoomPrivate, setIsNewRoomPrivate] = useState(false);

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

  const handleToggleCreatePanel = () => {
    soundManager.buttonClick();
    setIsCreatePanelOpen(!isCreatePanelOpen);
    if (!isCreatePanelOpen) {
      // Reset form when opening
      setNewRoomName('');
      setNewRoomPassword('');
      setIsNewRoomPrivate(false);
    }
  };

  const handleCreateRoomSubmit = async () => {
    if (!newRoomName.trim()) return;
    
    soundManager.buttonClick();
    try {
      const newRoom = await createRoom(newRoomName.trim(), isNewRoomPrivate ? newRoomPassword : undefined);
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
            onClick={handleToggleCreatePanel}
            onMouseEnter={() => soundManager.buttonHover()}
          >
            {isCreatePanelOpen ? t('common.cancel') : t('room.createRoom')}
          </CreateRoomButton>
        </div>
      </Header>

      <CreateRoomPanel isOpen={isCreatePanelOpen}>
        <PanelContent>
          <PanelInputGroup>
            <PanelLabel>{t('room.roomName')}</PanelLabel>
            <PanelInput 
              type="text" 
              placeholder={t('room.enterRoomName')}
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              autoFocus={isCreatePanelOpen}
            />
          </PanelInputGroup>

          <PanelInputGroup>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PanelLabel>{t('room.roomPassword')}</PanelLabel>
              <ToggleContainer onClick={() => setIsNewRoomPrivate(!isNewRoomPrivate)}>
                <span style={{ fontSize: '0.8rem', color: isNewRoomPrivate ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                  {isNewRoomPrivate ? t('room.private') : t('room.public')}
                </span>
                <ToggleSwitch checked={isNewRoomPrivate} />
              </ToggleContainer>
            </div>
            <PanelInput 
              type="password" 
              placeholder={isNewRoomPrivate ? t('room.enterRoomPassword') : t('room.noPassword')}
              value={newRoomPassword}
              onChange={(e) => setNewRoomPassword(e.target.value)}
              disabled={!isNewRoomPrivate}
              style={{ opacity: isNewRoomPrivate ? 1 : 0.5 }}
            />
          </PanelInputGroup>

          <PanelButton 
            variant="primary" 
            onClick={handleCreateRoomSubmit}
            disabled={!newRoomName.trim()}
            style={{ opacity: !newRoomName.trim() ? 0.5 : 1 }}
          >
            {t('room.deploy')}
          </PanelButton>
        </PanelContent>
      </CreateRoomPanel>

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