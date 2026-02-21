import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../contexts/RoomContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { GameRoom, GameMode } from '../types/game';
import soundManager from '../utils/soundManager';

const RoomListContainer = styled.div`
  background: transparent;
  padding: 0;
  margin-bottom: 0;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const CreateRoomOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(24px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.isOpen ? 1 : 0};
  pointer-events: ${props => props.isOpen ? 'all' : 'none'};
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    overflow-y: auto;
  }
`;

const ConsoleContainer = styled.div`
  width: min(800px, calc(100vw - 24px));
  background: var(--surface-color);
  backdrop-filter: blur(16px);
  border: 1px solid var(--surface-border);
  border-radius: 24px;
  padding: 28px;
  position: relative;
  box-shadow: 0 0 100px rgba(99, 102, 241, 0.1);
  max-height: min(92vh, 860px);
  overflow-y: auto;
  
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 20%;
    right: 20%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
  }

  @media (max-width: 768px) {
    border-radius: 16px;
    padding: 18px 14px 16px;
    max-height: calc(100vh - 20px);
    margin: 8px auto;
  }
`;

const ConsoleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ConsoleTitle = styled.h2`
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(to right, var(--text-primary), var(--primary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 1.4rem;
    letter-spacing: 1px;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: var(--surface-highlight);
    color: var(--text-primary);
    border-color: var(--text-primary);
  }
`;

const ConsoleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const ConsoleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ConsoleLabel = styled.label`
  font-family: 'Rajdhani', sans-serif;
  color: var(--text-primary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ConsoleInput = styled.input`
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 16px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 0 30px rgba(99, 102, 241, 0.1);
  }
`;

const ModeCard = styled.div<{ $active: boolean; $color: string }>`
  background: ${props => props.$active ? `rgba(${props.$color}, 0.1)` : 'var(--surface-highlight)'};
  border: 1px solid ${props => props.$active ? `rgba(${props.$color}, 0.5)` : 'var(--surface-border)'};
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 16px;
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(${props => props.$color}, 0.3);
  }
`;

const ModeIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(${props => props.$color}, 0.2);
  color: rgb(${props => props.$color});
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
`;

const ModeInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ModeTitle = styled.span`
  color: var(--text-primary);
  font-weight: 700;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
`;

const ModeDesc = styled.span`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

const DeployButton = styled.button`
  grid-column: 1 / -1;
  margin-top: 20px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  padding: 20px;
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 14px;
    font-size: 1rem;
    letter-spacing: 1px;
    margin-top: 8px;
  }
`;

const TimeOptionRow = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`;

const TimeOption = styled.div<{ $active: boolean }>`
  flex: 1;
  text-align: center;
  padding: 14px 0;
  border-radius: 12px;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? 'rgba(99, 102, 241, 0.18)' : 'var(--surface-highlight)'};
  border: 1px solid ${props => props.$active ? 'var(--primary-color)' : 'var(--surface-border)'};
  color: ${props => props.$active ? 'var(--primary-color)' : 'var(--text-secondary)'};

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
`;

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
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
  background: ${props => props.checked ? 'var(--primary-color)' : 'var(--surface-border)'};
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
    background: var(--bg-color);
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  display: none;
`;

const CreateRoomButton = styled.button`
  position: fixed;
  bottom: 40px;
  right: 40px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: white;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 15px 40px rgba(99, 102, 241, 0.6);
  }
`;

const RefreshButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-secondary);
  border: 1px solid var(--surface-border);
  width: auto;
  min-width: 80px;
  padding: 0 16px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Rajdhani', 'Microsoft YaHei', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  
  &:hover {
    background: var(--surface-border);
    color: var(--text-primary);
    border-color: var(--text-muted);
  }
  
  svg {
    width: 18px;
    height: 18px;
    margin-right: 8px;
  }
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;
  flex: 1;
  padding-bottom: 100px; /* Space for FAB */
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--surface-border);
    border-radius: 3px;
    
    &:hover {
      background: var(--surface-highlight);
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding-bottom: 80px;
  }
`;

const RoomCard = styled.div`
  background: var(--surface-color);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid var(--surface-border);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
  
  /* Glass Reflection */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, var(--surface-highlight) 0%, transparent 100%);
    pointer-events: none;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    background: var(--surface-highlight);
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
    
    &::after {
      opacity: 1;
    }
  }
  
  /* Neon Glow Border */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 1px;
    background: var(--primary-gradient);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
`;

const RoomHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  z-index: 1;
`;

const RoomName = styled.h3`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RoomId = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
  font-weight: 400;
`;

const RoomStatus = styled.div<{ status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: ${props => {
    switch (props.status) {
      case 'waiting': return 'rgba(16, 185, 129, 0.2)';
      case 'playing': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(100, 116, 139, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'waiting': return '#34d399';
      case 'playing': return '#fbbf24';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'waiting': return 'rgba(16, 185, 129, 0.3)';
      case 'playing': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(100, 116, 139, 0.3)';
    }
  }};
`;

const RoomFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 1;
`;

const PlayerAvatars = styled.div`
  display: flex;
  align-items: center;
`;

const Avatar = styled.div<{ image?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  border: 2px solid var(--surface-color);
  margin-left: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: white;
  font-weight: 600;
  
  &:first-child {
    margin-left: 0;
  }
`;

const PlayerCount = styled.div`
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
`;

const ModeBadge = styled.div<{ mode: string }>`
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 4rem;
  opacity: 0.05;
  pointer-events: none;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  color: ${props => props.mode === 'creative' ? '#fbbf24' : '#6366f1'};
  transform: rotate(-15deg);
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
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
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
  color: var(--text-primary);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(to right, var(--text-primary), #a5b4fc);
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
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.5px;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2), 0 0 15px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: var(--text-muted);
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
    color: var(--primary-color);
  }
`;

const Checkbox = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-highlight);
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
    background: var(--surface-highlight);
    color: var(--text-secondary);
    border: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-border);
      color: var(--text-primary);
      border-color: var(--text-muted);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
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
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  // Create Room State
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isNewRoomPrivate, setIsNewRoomPrivate] = useState(false);
  const [newRoomGameMode, setNewRoomGameMode] = useState<GameMode>('classic');
  const [turnTimeLimit, setTurnTimeLimit] = useState(60);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [rejoiningRoomId, setRejoiningRoomId] = useState<string | null>(null);

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
      const newRoom = await createRoom(
        newRoomName.trim(),
        isNewRoomPrivate ? newRoomPassword : undefined,
        { turnTimeLimit },
        newRoomGameMode,
      );
      if (newRoom) {
        navigate(`/room/${newRoom.id}`);
      }
    } catch (error: any) {
      console.error('创建房间失败:', error);
      if (error && typeof error === 'string' && error.startsWith('ALREADY_IN_ROOM')) {
        const roomId = error.split(':')[1];
        showToast(t('room.alreadyInRoom') || `您已在房间 ${roomId} 中，请先退出该房间`);
      } else {
        showToast(t('gameRoom.startFailed') || '创建房间失败，请重试');
      }
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
        showToast(password ? '密码错误或加入失败，请重试' : '加入房间失败，请重试');
      }
    } catch (error: any) {
      console.error('加入房间失败:', error);
      if (error && typeof error === 'string' && error.startsWith('ALREADY_IN_ROOM')) {
        const roomId = error.split(':')[1];
        showToast(t('room.alreadyInRoom') || `您已在房间 ${roomId} 中，请先退出该房间`);
      } else {
        showToast(password ? '密码错误或加入失败，请重试' : '加入房间失败，请重试');
      }
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
        const path = room.gameMode === 'creative' ? '/creative' : '/game';
        navigate(`${path}?roomId=${room.id}&spectate=true`);
      } else {
        showToast('无法观战，请重试');
      }
    } catch (error) {
      console.error('观战失败:', error);
      showToast('观战失败，请重试');
    }
  };

  // 回到游戏：先重连 socket 房间，再直接进入游戏（不经过房间页）
  const handleRejoinGame = async (room: GameRoom) => {
    soundManager.buttonClick();
    if (rejoiningRoomId) return;
    setRejoiningRoomId(room.id);
    try {
      const success = await joinRoom(room.id);
      if (success) {
        const path = room.gameMode === 'creative' ? '/creative' : '/game';
        navigate(`${path}?roomId=${room.id}`, { state: { showTransition: true } });
      } else {
        showToast(t('game.resumeFailed') || '回到游戏失败，请重试');
      }
    } catch (error) {
      console.error('回到游戏失败:', error);
      showToast(t('game.resumeFailed') || '回到游戏失败，请重试');
    } finally {
      setRejoiningRoomId(null);
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
    return isUserInRoom(room) && (room.status === 'waiting' || room.status === 'playing');
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
      const isPlaying = room.status === 'playing';
      return (
        <JoinButton
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) {
              handleRejoinGame(room);
            } else {
              soundManager.buttonClick();
              navigate(`/room/${room.id}`);
            }
          }}
          onMouseEnter={() => soundManager.buttonHover()}
          disabled={isPlaying && !!rejoiningRoomId}
        >
          {isPlaying
            ? (rejoiningRoomId === room.id ? (t('common.loading') || '加载中...') : (t('game.resume') || '回到游戏'))
            : (t('room.join') || '进入房间')}
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
        <RefreshButton 
          onClick={() => {
            soundManager.buttonClick();
            refreshRooms();
          }}
          onMouseEnter={() => soundManager.buttonHover()}
        >
          {t('common.refresh')}
        </RefreshButton>
      </Header>

      <CreateRoomButton 
        onClick={handleToggleCreatePanel}
        onMouseEnter={() => soundManager.buttonHover()}
      >
        +
      </CreateRoomButton>

      <CreateRoomOverlay isOpen={isCreatePanelOpen}>
        <ConsoleContainer>
          <ConsoleHeader>
            <ConsoleTitle>{t('room.createRoom')}</ConsoleTitle>
            <CloseButton onClick={handleToggleCreatePanel}>✕</CloseButton>
          </ConsoleHeader>

          <ConsoleGrid>
            <ConsoleSection>
              <ConsoleLabel>{t('room.roomName')}</ConsoleLabel>
              <ConsoleInput 
                type="text" 
                placeholder={t('room.enterRoomNamePlaceholder')}
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                autoFocus={isCreatePanelOpen}
              />
            </ConsoleSection>

            <ConsoleSection>
              <ConsoleLabel>{t('room.roomPassword')}</ConsoleLabel>
              <div style={{ display: 'flex', gap: '10px' }}>
                <ConsoleInput 
                  type="password" 
                  placeholder={isNewRoomPrivate ? "******" : t('room.noPasswordPlaceholder')}
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  disabled={!isNewRoomPrivate}
                  style={{ flex: 1, opacity: isNewRoomPrivate ? 1 : 0.5 }}
                />
                <ToggleContainer onClick={() => setIsNewRoomPrivate(!isNewRoomPrivate)}>
                  <ToggleSwitch checked={isNewRoomPrivate} />
                </ToggleContainer>
              </div>
            </ConsoleSection>

            <ConsoleSection style={{ gridColumn: '1 / -1' }}>
              <ConsoleLabel>{t('room.gameMode')}</ConsoleLabel>
              <ModeGrid>
                <ModeCard 
                  $active={newRoomGameMode === 'classic'} 
                  $color="99, 102, 241"
                  onClick={() => { soundManager.buttonClick(); setNewRoomGameMode('classic'); }}
                >
                  <ModeIcon $color="99, 102, 241">⚡</ModeIcon>
                  <ModeInfo>
                    <ModeTitle>{t('lobby.classicMode')}</ModeTitle>
                    <ModeDesc>{t('room.standardRules')}</ModeDesc>
                  </ModeInfo>
                </ModeCard>

                <ModeCard 
                  $active={newRoomGameMode === 'creative'} 
                  $color="251, 191, 36"
                  onClick={() => { soundManager.buttonClick(); setNewRoomGameMode('creative'); }}
                >
                  <ModeIcon $color="251, 191, 36">✨</ModeIcon>
                  <ModeInfo>
                    <ModeTitle>{t('lobby.creativeMode')}</ModeTitle>
                    <ModeDesc>{t('room.creativeRules')}</ModeDesc>
                  </ModeInfo>
                </ModeCard>
              </ModeGrid>
            </ConsoleSection>

            <ConsoleSection style={{ gridColumn: '1 / -1' }}>
              <ConsoleLabel>{t('room.turnTime') || '回合时间'}</ConsoleLabel>
              <TimeOptionRow>
                {[30, 60, 90, 120].map(sec => (
                  <TimeOption
                    key={sec}
                    $active={turnTimeLimit === sec}
                    onClick={() => { soundManager.buttonClick(); setTurnTimeLimit(sec); }}
                  >
                    {sec}s
                  </TimeOption>
                ))}
              </TimeOptionRow>
            </ConsoleSection>

            <DeployButton 
              onClick={handleCreateRoomSubmit}
              disabled={!newRoomName.trim()}
              onMouseEnter={() => soundManager.buttonHover()}
            >
              {t('room.deploy')} {t('room.system')}
            </DeployButton>
          </ConsoleGrid>
        </ConsoleContainer>
      </CreateRoomOverlay>

      {isLoading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : rooms.length === 0 ? (
        <EmptyState>{t('room.noRooms')}</EmptyState>
      ) : null}
      
      <RoomGrid>
        {rooms.map(room => (
          <RoomCard 
            key={room.id}
            onMouseEnter={() => soundManager.buttonHover()}
            onClick={() => {
              if (canRejoinRoom(room)) {
                if (room.status === 'playing') {
                  handleRejoinGame(room);
                } else {
                  soundManager.buttonClick();
                  navigate(`/room/${room.id}`);
                }
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
                <RoomId>ID: {room.id.slice(0, 8)}</RoomId>
              </RoomName>
              <RoomStatus status={room.status}>
                {getStatusText(room.status)}
              </RoomStatus>
            </RoomHeader>
            
            <ModeBadge mode={room.gameMode || 'classic'}>
              {(room.gameMode || 'classic') === 'creative' ? t('room.creativeTag') : t('room.classicTag')}
            </ModeBadge>
            
            <RoomFooter>
              <PlayerAvatars>
                {room.players.map((player, index) => (
                  <Avatar 
                    key={player.id} 
                    image={player.avatar}
                    title={player.nickname}
                    style={{ zIndex: 10 - index }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </Avatar>
                ))}
                <PlayerCount>
                  {room.players.length}/{room.maxPlayers}
                </PlayerCount>
              </PlayerAvatars>
              
              {getActionButton(room)}
            </RoomFooter>
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