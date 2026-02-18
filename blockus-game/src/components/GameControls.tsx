// 游戏控制组件

import React from 'react';
import styled from 'styled-components';
import { GameState } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import soundManager from '../utils/soundManager';

interface GameControlsProps {
  gameState: GameState;
  onSettle: () => void;
  onReset: () => void;
  canPlayerContinue: (player: any) => boolean;
  myScore?: number;
}

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 20px;
  padding: 0;
  background: transparent;
  min-height: auto;
  max-height: none;
  overflow: visible;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    gap: 0;
    width: 100%;
    padding: 8px 0;
  }
`;

const GameStatus = styled.div`
  text-align: right;
  padding: 0;
  background: transparent;
  border: none;
  min-width: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;

  @media (max-width: 768px) {
    flex-direction: row;
    gap: 0;
    width: 100%;
    justify-content: space-around;
    align-items: center;
  }
`;

const StatusSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  @media (max-width: 768px) {
    align-items: center;
  }
`;

const StatusTitle = styled.h3`
  margin: 0 0 4px 0;
  color: var(--text-secondary);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  opacity: 0.8;

  @media (max-width: 768px) {
    font-size: 11px;
    margin: 0 0 2px 0;
    letter-spacing: 1px;
  }
`;

const StatusText = styled.div<{ isCurrentTurn: boolean }>`
  font-size: 24px;
  color: ${props => props.isCurrentTurn ? '#10b981' : 'var(--text-primary)'};
  font-weight: ${props => props.isCurrentTurn ? 'bold' : '500'};
  text-shadow: ${props => props.isCurrentTurn ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'};
  font-family: 'Rajdhani', sans-serif;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const ScoreValue = styled.div`
  font-size: 48px;
  font-weight: 700;
  font-family: 'Orbitron', sans-serif;
  color: #fbbf24;
  text-align: right;
  line-height: 1;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
  
  background: linear-gradient(to bottom, #fbbf24, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.3));

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const TimeDisplay = styled.div<{ timeLeft: number }>`
  font-size: 48px;
  font-weight: 700;
  font-family: 'Orbitron', sans-serif;
  color: ${props => {
    if (props.timeLeft <= 5) return '#ef4444';
    if (props.timeLeft <= 10) return '#f59e0b';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  text-align: right;
  line-height: 1;
  -webkit-text-stroke: ${props => props.timeLeft > 10 ? '1px rgba(255, 255, 255, 0.3)' : 'none'};
  text-shadow: 0 0 10px ${props => {
    if (props.timeLeft <= 5) return 'rgba(239, 68, 68, 0.4)';
    if (props.timeLeft <= 10) return 'rgba(245, 158, 11, 0.4)';
    return 'none';
  }};

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' | 'danger'; isUrgent?: boolean }>`
  padding: 10px 20px; /* Increased padding */
  border: none;
  border-radius: 8px;
  font-size: 14px; /* Increased from 13px */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px; /* Increased min-width */
  
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'rgba(16, 185, 129, 0.2)';
      case 'secondary': return 'rgba(59, 130, 246, 0.2)';
      case 'danger': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(16, 185, 129, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.variant) {
      case 'primary': return '#10b981';
      case 'secondary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return '#10b981';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'primary': return 'rgba(16, 185, 129, 0.3)';
      case 'secondary': return 'rgba(59, 130, 246, 0.3)';
      case 'danger': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(16, 185, 129, 0.3)';
    }
  }};
  
  ${props => props.isUrgent && `
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
  `}
  
  &:hover {
    transform: translateY(-1px);
    background: ${props => {
      switch (props.variant) {
        case 'primary': return 'rgba(16, 185, 129, 0.3)';
        case 'secondary': return 'rgba(59, 130, 246, 0.3)';
        case 'danger': return 'rgba(239, 68, 68, 0.3)';
        default: return 'rgba(16, 185, 129, 0.3)';
      }
    }};
  }
  
  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    border-color: var(--surface-border);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const GamePhaseDisplay = styled.div<{ phase: string }>`
  padding: 8px 16px; /* Increased padding */
  border-radius: 8px;
  font-weight: bold;
  text-align: center;
  background: ${props => {
    switch (props.phase) {
      case 'waiting': return 'rgba(59, 130, 246, 0.2)';
      case 'playing': return 'rgba(16, 185, 129, 0.2)';
      case 'settling': return 'rgba(245, 158, 11, 0.2)';
      case 'finished': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.phase) {
      case 'waiting': return '#3b82f6';
      case 'playing': return '#10b981';
      case 'settling': return '#f59e0b';
      case 'finished': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.phase) {
      case 'waiting': return 'rgba(59, 130, 246, 0.3)';
      case 'playing': return 'rgba(16, 185, 129, 0.3)';
      case 'settling': return 'rgba(245, 158, 11, 0.3)';
      case 'finished': return 'rgba(239, 68, 68, 0.3)';
      default: return 'var(--surface-border)';
    }
  }};
  margin-bottom: 6px;
  font-size: 14px; /* Increased from 13px */
`;

const GameControls: React.FC<GameControlsProps> = ({ 
  gameState, 
  onSettle, 
  onReset, 
  canPlayerContinue,
  myScore
}) => {
  const { t } = useLanguage();
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isCurrentTurn = currentPlayer.isCurrentTurn;
  const isGameOver = gameState.gamePhase === 'finished';
  
  // 判断是否可以结算
  // 只有在自己的回合，且还没有结算过的玩家才能结算
  const canSettle = isCurrentTurn && !currentPlayer.isSettled;
  
  // 判断是否应该提示结算（没有合法落子位置）
  const shouldShowSettleHint = canSettle && !canPlayerContinue(currentPlayer);

  const handleResetClick = () => {
    soundManager.buttonClick();
    onReset();
  };

  return (
    <ControlsContainer>
      <GameStatus>
        <StatusSection>
          <StatusTitle>{t('game.status')}</StatusTitle>
          <StatusText isCurrentTurn={isCurrentTurn}>
            {isCurrentTurn ? t('game.yourTurn') : `${currentPlayer.name} ${t('game.turn')}`}
          </StatusText>
        </StatusSection>
        
        {myScore !== undefined && (
          <StatusSection>
            <StatusTitle>{t('game.score') || 'SCORE'}</StatusTitle>
            <ScoreValue>{myScore}</ScoreValue>
          </StatusSection>
        )}

        {gameState.timeLeft > 0 && (
          <StatusSection>
            <StatusTitle>{t('game.time') || 'TIME'}</StatusTitle>
            <TimeDisplay timeLeft={gameState.timeLeft}>
              {gameState.timeLeft}s
            </TimeDisplay>
          </StatusSection>
        )}
      </GameStatus>
      
      <ButtonsContainer>
        {/* Settle button removed from here to avoid duplication with the floating button */}
        
        {/* ... Debug Info ... */}
        
        {/* ... Game Over Hint ... */}
        
        {isGameOver && (
          <Button 
            variant="primary" 
            onClick={handleResetClick}
            onMouseEnter={() => soundManager.buttonHover()}
          >
            {t('game.restart')}
          </Button>
        )}
      </ButtonsContainer>
    </ControlsContainer>
  );
};

export default GameControls;