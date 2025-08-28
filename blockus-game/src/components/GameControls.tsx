// 游戏控制组件

import React from 'react';
import styled from 'styled-components';
import { GameState } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';

interface GameControlsProps {
  gameState: GameState;
  onSettle: () => void;
  onReset: () => void;
  canPlayerContinue: (player: any) => boolean;
}

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  min-height: 180px;
  max-height: 280px;
  overflow-y: auto;
  
  /* 确保内容完全可见 */
  &:hover {
    max-height: 320px;
    transition: max-height 0.3s ease;
  }
  
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  
  @media (max-width: 768px) {
    padding: 6px;
    min-height: 160px;
    max-height: 240px;
    
    &:hover {
      max-height: 280px;
    }
  }
  
  @media (max-width: 480px) {
    padding: 5px;
    min-height: 140px;
    max-height: 200px;
    
    &:hover {
      max-height: 240px;
    }
  }
`;

const GameStatus = styled.div`
  text-align: center;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 260px;
  
  @media (max-width: 768px) {
    min-width: 220px;
    padding: 6px;
  }
  
  @media (max-width: 480px) {
    min-width: 200px;
    padding: 5px;
  }
`;

const StatusTitle = styled.h3`
  margin: 0 0 6px 0;
  color: #333;
  font-size: 14px;
  
  @media (max-width: 768px) {
    font-size: 13px;
    margin: 0 0 5px 0;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
    margin: 0 0 4px 0;
  }
`;

const StatusText = styled.div<{ isCurrentTurn: boolean }>`
  font-size: 14px;
  color: ${props => props.isCurrentTurn ? '#4CAF50' : '#666'};
  font-weight: ${props => props.isCurrentTurn ? 'bold' : 'normal'};
  margin: 2px 0;
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const TimeDisplay = styled.div<{ timeLeft: number }>`
  font-size: 18px;
  font-weight: bold;
  color: ${props => {
    if (props.timeLeft <= 5) return '#f44336';
    if (props.timeLeft <= 10) return '#ff9800';
    return '#4CAF50';
  }};
  text-align: center;
  margin: 4px 0;
  
  @media (max-width: 768px) {
    font-size: 16px;
    margin: 3px 0;
  }
  
  @media (max-width: 480px) {
    font-size: 14px;
    margin: 2px 0;
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 2px 0;
  
  @media (max-width: 768px) {
    gap: 5px;
    margin: 1px 0;
  }
  
  @media (max-width: 480px) {
    gap: 4px;
  }
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' | 'danger'; isUrgent?: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 90px;
  
  background: ${props => {
    switch (props.variant) {
      case 'primary': return '#4CAF50';
      case 'secondary': return '#2196F3';
      case 'danger': return '#f44336';
      default: return '#4CAF50';
    }
  }};
  
  color: white;
  
  ${props => props.isUrgent && `
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const GamePhaseDisplay = styled.div<{ phase: string }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: bold;
  text-align: center;
  background: ${props => {
    switch (props.phase) {
      case 'waiting': return '#2196F3';
      case 'playing': return '#4CAF50';
      case 'settling': return '#ff9800';
      case 'finished': return '#f44336';
      default: return '#666';
    }
  }};
  color: white;
  margin-bottom: 6px;
  font-size: 13px;
`;

const GameControls: React.FC<GameControlsProps> = ({ 
  gameState, 
  onSettle, 
  onReset, 
  canPlayerContinue 
}) => {
  const { t } = useLanguage();
  const { gamePhase, players, currentPlayerIndex, turnCount, timeLeft } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  const isGameOver = gamePhase === 'finished';
  const canSettle = gamePhase === 'playing' && currentPlayer.color === 'red' && !currentPlayer.isSettled;
  const shouldShowSettleHint = canSettle && !canPlayerContinue(currentPlayer);

  return (
    <ControlsContainer>
      {/* 游戏状态显示 */}
      <GameStatus>
        <StatusTitle>
          {gamePhase === 'playing' ? t('game.gameInProgress') : t('game.gameOver')}
        </StatusTitle>
        
        <StatusText isCurrentTurn={false}>
          {t('game.currentTurn')}: {currentPlayer.name === 'Player' ? t('player.player') : currentPlayer.name}
        </StatusText>
        
        <StatusText isCurrentTurn={false}>
          {t('game.status')}: {gamePhase === 'playing' ? t('game.inProgress') : t('game.finished')}
        </StatusText>
        
        <StatusText isCurrentTurn={false}>
          {t('game.turn')}: {turnCount}
        </StatusText>
        
        {/* 显示结算状态 */}
        <StatusText isCurrentTurn={false}>
          {t('game.settled')}: {players.filter(p => p.isSettled).length}/4
        </StatusText>
        
        {gamePhase === 'playing' && currentPlayer.color === 'red' && (
          <TimeDisplay timeLeft={timeLeft}>
            ⏰ {timeLeft}{t('settings.seconds')}
          </TimeDisplay>
        )}
      </GameStatus>
      
      {/* 按钮区域 - 始终显示 */}
      <ButtonsContainer>
        {canSettle && (
          <Button 
            variant={shouldShowSettleHint ? 'danger' : 'secondary'} 
            onClick={onSettle}
            isUrgent={shouldShowSettleHint}
          >
            {shouldShowSettleHint ? `🏁 ${t('game.endSettle')}` : t('game.settle')}
          </Button>
        )}
        
        {/* 调试信息 - 显示为什么按钮不显示 */}
        {!canSettle && currentPlayer.color === 'red' && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            textAlign: 'center',
            padding: '4px',
            background: '#f0f0f0',
            borderRadius: '4px',
            margin: '2px 0'
          }}>
            {currentPlayer.isSettled ? t('game.settled') : gamePhase !== 'playing' ? `${t('game.gamePhase')}: ${gamePhase}` : t('game.canContinue')}
          </div>
        )}
        
        {/* 游戏结束提示 - 只有当玩家无法继续时才显示 */}
        {gamePhase === 'playing' && 
         currentPlayer.color === 'red' && 
         !currentPlayer.isSettled && 
         !canPlayerContinue(currentPlayer) && (
          <div style={{ 
            fontSize: '11px', 
            color: '#ff9800', 
            textAlign: 'center',
            padding: '4px',
            background: '#fff3e0',
            borderRadius: '4px',
            margin: '2px 0',
            fontWeight: 'bold'
          }}>
            💡 {t('game.cannotPlaceHint')}
          </div>
        )}
        
        {isGameOver && (
          <Button variant="primary" onClick={onReset}>
            {t('game.restart')}
          </Button>
        )}
      </ButtonsContainer>
      
      {/* 游戏结果 - 只在游戏结束时显示 */}
      {isGameOver && (
        <GameStatus>
          <StatusTitle>🏆 {t('game.finalRanking')}</StatusTitle>
          {players
            .sort((a, b) => b.score - a.score)
            .slice(0, 3) // 只显示前3名，节省空间
            .map((player, index) => (
              <StatusText key={player.id} isCurrentTurn={false}>
                {index + 1}. {player.name}: {player.score}{t('game.points')}
              </StatusText>
            ))
          }
        </GameStatus>
      )}
      
      {/* 滚动提示 */}
      <div style={{ 
        fontSize: '11px', 
        color: '#999', 
        textAlign: 'center', 
        marginTop: '4px',
        fontStyle: 'italic'
      }}>
        💡 {t('game.hoverHint')}
      </div>
    </ControlsContainer>
  );
};

export default GameControls;
