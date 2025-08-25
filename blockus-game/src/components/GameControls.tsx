// 游戏控制组件

import React from 'react';
import styled from 'styled-components';
import { GameState } from '../types/game';

interface GameControlsProps {
  gameState: GameState;
  onSettle: () => void;
  onReset: () => void;
}

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
`;

const GameStatus = styled.div`
  text-align: center;
  padding: 15px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 300px;
`;

const StatusTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
`;

const StatusText = styled.div<{ isCurrentTurn: boolean }>`
  font-size: 16px;
  color: ${props => props.isCurrentTurn ? '#4CAF50' : '#666'};
  font-weight: ${props => props.isCurrentTurn ? 'bold' : 'normal'};
`;

const TimeDisplay = styled.div<{ timeLeft: number }>`
  font-size: 24px;
  font-weight: bold;
  color: ${props => {
    if (props.timeLeft <= 5) return '#f44336';
    if (props.timeLeft <= 10) return '#ff9800';
    return '#4CAF50';
  }};
  text-align: center;
  margin: 10px 0;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  
  background: ${props => {
    switch (props.variant) {
      case 'primary': return '#4CAF50';
      case 'secondary': return '#2196F3';
      case 'danger': return '#f44336';
      default: return '#4CAF50';
    }
  }};
  
  color: white;
  
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
  padding: 10px 20px;
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
  margin-bottom: 15px;
`;

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  onSettle,
  onReset
}) => {
  const { gamePhase, timeLeft, players, currentPlayerIndex } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  const getPhaseText = (phase: string): string => {
    switch (phase) {
      case 'waiting': return '等待开始';
      case 'playing': return '游戏进行中';
      case 'settling': return '结算中';
      case 'finished': return '游戏结束';
      default: return '未知状态';
    }
  };
  
  const canSettle = currentPlayer.color === 'red' && !currentPlayer.isSettled;
  const isGameOver = gamePhase === 'finished';
  
  return (
    <ControlsContainer>
      <GamePhaseDisplay phase={gamePhase}>
        {getPhaseText(gamePhase)}
      </GamePhaseDisplay>
      
      <GameStatus>
        <StatusTitle>当前回合</StatusTitle>
        <StatusText isCurrentTurn={true}>
          {currentPlayer.name}
        </StatusText>
        
        {gamePhase === 'playing' && currentPlayer.color === 'red' && (
          <TimeDisplay timeLeft={timeLeft}>
            剩余时间: {timeLeft}秒
          </TimeDisplay>
        )}
        
        <StatusText isCurrentTurn={false}>
          状态: {currentPlayer.isSettled ? '已结算' : '进行中'}
        </StatusText>
      </GameStatus>
      
      <ButtonsContainer>
        {canSettle && (
          <Button variant="secondary" onClick={onSettle}>
            结算
          </Button>
        )}
        
        {isGameOver && (
          <Button variant="primary" onClick={onReset}>
            重新开始
          </Button>
        )}
      </ButtonsContainer>
      
      {isGameOver && (
        <GameStatus>
          <StatusTitle>游戏结果</StatusTitle>
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <StatusText key={player.id} isCurrentTurn={false}>
                {index + 1}. {player.name}: {player.score}分
              </StatusText>
            ))
          }
        </GameStatus>
      )}
    </ControlsContainer>
  );
};

export default GameControls;
