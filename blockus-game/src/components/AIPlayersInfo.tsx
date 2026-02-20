// AI玩家信息组件

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Player } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';
import { useLanguage } from '../contexts/LanguageContext';
import GameRulesModal from './GameRulesModal';

interface AIPlayersInfoProps {
  aiPlayers: Player[];
  thinkingAI: string | null;
  aiDifficulty?: string; // 新增属性
}

// 获取AI难度显示文本
const getDifficultyText = (difficulty: string, t: (key: string) => string) => {
  switch (difficulty) {
    case 'easy': return t('settings.easy');
    case 'medium': return t('settings.medium');
    case 'hard': return t('settings.hard');
    default: return t('settings.medium');
  }
};

// 获取AI难度颜色
const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return '#4CAF50';
    case 'medium': return '#FF9800';
    case 'hard': return '#F44336';
    default: return '#FF9800';
  }
};

const thinkingPulse = keyframes`
  0%, 100% { border-color: #ff4444; box-shadow: 0 0 8px rgba(255, 68, 68, 0.3); }
  50% { border-color: #ff8888; box-shadow: 0 0 20px rgba(255, 68, 68, 0.6); }
`;

const dotsAnimation = keyframes`
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: row;
    gap: 15px;
    width: auto;
    height: 100%;
    align-items: center;
  }
`;

const PlayerCard = styled.div<{ color: string; $isCurrentTurn: boolean; $isThinking: boolean }>`
  background: ${props => props.$isCurrentTurn ? 'var(--surface-highlight)' : 'var(--surface-color)'};
  border-radius: 8px;
  padding: 10px 14px;
  border-left: 4px solid ${props => {
    if (props.$isThinking) return '#ff4444';
    if (props.$isCurrentTurn) return PLAYER_COLORS[props.color];
    return 'transparent';
  }};
  transition: all 0.3s ease;
  cursor: pointer; /* Add pointer cursor */
  
  /* 紧凑布局 */
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    background: var(--surface-highlight);
  }

  @media (max-width: 768px) {
    min-width: 180px;
    border-left: none;
    border-bottom: 4px solid ${props => {
      if (props.$isThinking) return '#ff4444';
      if (props.$isCurrentTurn) return PLAYER_COLORS[props.color];
      return 'transparent';
    }};
    padding: 8px 12px;
    background: ${props => props.$isCurrentTurn ? 'var(--surface-highlight)' : 'var(--surface-color)'};
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

const PlayerAvatar = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => PLAYER_COLORS[props.color]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  box-shadow: 0 0 8px ${props => PLAYER_COLORS[props.color]};
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
`;

const PlayerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
`;

const PlayerName = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const PlayerStatus = styled.div<{ $isCurrentTurn: boolean; $isSettled: boolean; $isThinking: boolean; $isOffline?: boolean }>`
  font-size: 13px;
  color: ${props => {
    if (props.$isThinking) return '#ff4444';
    if (props.$isCurrentTurn) return '#FF9800';
    if (props.$isSettled) return '#4CAF50';
    if (props.$isOffline) return '#9CA3AF';
    return 'var(--text-secondary)';
  }};
  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 768px) {
    font-size: 11px;
  }
`;

const ScoreBadge = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  font-family: 'Rajdhani', sans-serif;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

// --- Modal Components ---

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--surface-border);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: var(--text-primary);
  }
`;

const PiecesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
`;

const PieceItem = styled.div<{ color: string; isUsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  background: ${props => props.isUsed ? 'var(--surface-highlight)' : 'var(--surface-color)'};
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  opacity: ${props => props.isUsed ? 0.3 : 1};
`;

const ShapeCell = styled.div<{ isFilled: boolean; color: string }>`
  width: 8px;
  height: 8px;
  background: ${props => props.isFilled ? `var(--player-${props.color}-main)` : 'transparent'};
  border-radius: 1px;
  box-shadow: ${props => props.isFilled ? `0 0 4px var(--player-${props.color}-glow)` : 'none'};
`;

const PieceShape = styled.div<{ rows: number; cols: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
`;

const PieceGrid = styled.div<{ rows: number; cols: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.cols}, 8px);
  grid-template-rows: repeat(${props => props.rows}, 8px);
  gap: 1px;
`;

const AIPlayersInfo: React.FC<AIPlayersInfoProps> = ({ 
  aiPlayers, 
  thinkingAI, 
  aiDifficulty = 'medium' 
}) => {
  const { t } = useLanguage();
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const getStatusText = (player: Player): string => {
    if (player.isOffline) return t('game.offlineHosted') || '离线，托管 AI 代打中';
    if (player.isSettled) return t('game.settled');
    if (player.isCurrentTurn) return t('game.currentTurn');
    return t('game.waiting');
  };

  const handlePlayerClick = (player: Player) => {
    setViewingPlayer(player);
  };

  const closePiecesModal = () => {
    setViewingPlayer(null);
  };

  return (
    <>
      <Container>
        {aiPlayers.map(player => (
          <PlayerCard 
            key={player.id} 
            color={player.color}
            $isCurrentTurn={player.isCurrentTurn}
            $isThinking={thinkingAI === player.color}
            onClick={() => handlePlayerClick(player)}
            title={t('game.viewPieces') || 'Click to view pieces'}
          >
            <PlayerHeader>
              <PlayerAvatar color={player.color}>
                {player.name.charAt(0)}
              </PlayerAvatar>
              <PlayerInfo>
                <PlayerName>{player.name}</PlayerName>
                <PlayerStatus 
                  $isCurrentTurn={player.isCurrentTurn}
                  $isSettled={player.isSettled}
                  $isThinking={thinkingAI === player.color}
                  $isOffline={player.isOffline}
                >
                  {thinkingAI === player.color ? t('game.thinking') : getStatusText(player)}
                </PlayerStatus>
              </PlayerInfo>
            </PlayerHeader>
            
            <ScoreBadge>
              {player.score} {t('gameOver.points') || 'pts'}
            </ScoreBadge>
          </PlayerCard>
        ))}
      </Container>

      {viewingPlayer && (
        <ModalOverlay onClick={closePiecesModal}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <PlayerAvatar color={viewingPlayer.color} style={{ width: 30, height: 30, fontSize: 14 }}>
                  {viewingPlayer.name.charAt(0)}
                </PlayerAvatar>
                {viewingPlayer.name} - {t('game.viewPieces') || 'Pieces'}
              </ModalTitle>
              <CloseButton onClick={closePiecesModal}>&times;</CloseButton>
            </ModalHeader>
            <PiecesGrid>
              {viewingPlayer.pieces.sort((a, b) => b.type - a.type).map(piece => (
                <PieceItem key={piece.id} color={viewingPlayer.color} isUsed={piece.isUsed}>
                  <PieceShape rows={piece.shape.length} cols={piece.shape[0]?.length || 1}>
                    <PieceGrid rows={piece.shape.length} cols={piece.shape[0]?.length || 1}>
                      {piece.shape.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <ShapeCell
                            key={`${rowIndex}-${colIndex}`}
                            isFilled={cell === 1}
                            color={viewingPlayer.color}
                          />
                        ))
                      )}
                    </PieceGrid>
                  </PieceShape>
                </PieceItem>
              ))}
            </PiecesGrid>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default AIPlayersInfo;