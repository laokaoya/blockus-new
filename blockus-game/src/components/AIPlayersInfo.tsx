// AI玩家信息组件

import React, { useState } from 'react';
import styled from 'styled-components';
import { Player } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';
import { useLanguage } from '../contexts/LanguageContext';

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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 250px;
  
  @media (max-width: 1200px) {
    min-width: auto;
    width: 100%;
    max-width: 400px;
  }
  
  @media (max-width: 768px) {
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    gap: 10px;
  }
`;

const PlayerCard = styled.div<{ color: string; isCurrentTurn: boolean; isThinking: boolean }>`
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 3px solid ${props => {
    if (props.isThinking) return '#ff4444';
    if (props.isCurrentTurn) return '#FFD700';
    return 'transparent';
  }};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  @media (max-width: 768px) {
    padding: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-bottom: 8px;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
    margin-bottom: 6px;
  }
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
  
  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
    font-size: 16px;
  }
  
  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }
`;

const PlayerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PlayerName = styled.div`
  font-weight: bold;
  color: #333;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 15px;
  }
  
  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const PlayerStatus = styled.div<{ isCurrentTurn: boolean; isSettled: boolean; isThinking: boolean }>`
  font-size: 14px;
  color: ${props => {
    if (props.isThinking) return '#ff4444';
    if (props.isCurrentTurn) return '#FF9800';
    if (props.isSettled) return '#4CAF50';
    return '#666';
  }};
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const PlayerStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  
  @media (max-width: 768px) {
    margin: 8px 0;
  }
  
  @media (max-width: 480px) {
    margin: 6px 0;
  }
`;

const Score = styled.div`
  font-weight: bold;
  color: #333;
  font-size: 14px;
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const RemainingPieces = styled.div`
  color: #666;
  font-size: 13px;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
  
  @media (max-width: 480px) {
    font-size: 11px;
  }
`;

const ViewPiecesButton = styled.button<{ color: string }>`
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: ${props => PLAYER_COLORS[props.color]};
  color: white;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 6px;
    font-size: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 5px;
    font-size: 11px;
  }
`;

const DifficultyInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  color: #333;
  font-size: 14px;
  font-weight: bold;

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 13px;
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 12px;
  }
`;

const DifficultyLabel = styled.span`
  font-weight: normal;
  color: #666;
`;

const DifficultyValue = styled.span<{ difficulty: string }>`
  font-weight: bold;
  color: ${props => getDifficultyColor(props.difficulty)};
`;

const PiecesModal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 80vw;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button`
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #d32f2f;
  }
`;

const PiecesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
`;

const PieceItem = styled.div<{ isUsed: boolean; color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: ${props => props.isUsed ? '#ccc' : props.color};
  border: 2px solid #333;
  border-radius: 4px;
  opacity: ${props => props.isUsed ? 0.5 : 1};
`;

const CELL_SIZE = 8; // 每个小方格的边长
const GAP_SIZE = 1; // 小方格之间的间距

const PieceShape = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
`;

const PieceGrid = styled.div<{ rows: number; cols: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.cols}, ${CELL_SIZE}px);
  grid-template-rows: repeat(${props => props.rows}, ${CELL_SIZE}px);
  gap: ${GAP_SIZE}px;
`;

const ShapeCell = styled.div<{ isFilled: boolean }>`
  width: ${CELL_SIZE}px;
  height: ${CELL_SIZE}px;
  background: ${props => props.isFilled ? '#333' : 'transparent'};
  border-radius: 2px;
`;

const AIPlayersInfo: React.FC<AIPlayersInfoProps> = ({ 
  aiPlayers, 
  thinkingAI, 
  aiDifficulty = 'medium' 
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handleViewPieces = (player: Player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  const getStatusText = (player: Player): string => {
    if (player.isSettled) {
      return t('game.settled');
    }
    if (player.isCurrentTurn) {
      return t('game.currentTurn');
    }
    return t('game.waiting');
  };

  const getRemainingCount = (player: Player): number => {
    return player.pieces.filter(p => !p.isUsed).length;
  };

  return (
    <>
      <Container>
        {/* AI难度显示 */}
        <DifficultyInfo>
          <DifficultyLabel>{t('settings.aiDifficulty')}</DifficultyLabel>
          <DifficultyValue difficulty={aiDifficulty}>
            {getDifficultyText(aiDifficulty, t)}
          </DifficultyValue>
        </DifficultyInfo>

        {aiPlayers.map(player => (
          <PlayerCard 
            key={player.id} 
            color={player.color}
            isCurrentTurn={player.isCurrentTurn}
            isThinking={thinkingAI === player.color}
          >
            <PlayerHeader>
              <PlayerAvatar color={player.color}>
                {player.name.charAt(0)}
              </PlayerAvatar>
              <PlayerInfo>
                <PlayerName>{player.name}</PlayerName>
                <PlayerStatus 
                  isCurrentTurn={player.isCurrentTurn}
                  isSettled={player.isSettled}
                  isThinking={thinkingAI === player.color}
                >
                  {thinkingAI === player.color ? t('game.thinking') : getStatusText(player)}
                </PlayerStatus>
              </PlayerInfo>
            </PlayerHeader>
            
            <PlayerStats>
              <Score>{t('game.score')}: {player.score}</Score>
              <RemainingPieces>
                {t('game.remaining')}: {getRemainingCount(player)}{t('game.pieces')}
              </RemainingPieces>
            </PlayerStats>
            
            <ViewPiecesButton 
              color={player.color}
              onClick={() => handleViewPieces(player)}
            >
              {t('game.viewPieces')}
            </ViewPiecesButton>
          </PlayerCard>
        ))}
      </Container>
      
      <PiecesModal isOpen={isModalOpen} onClick={closeModal}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>{selectedPlayer?.name}{t('game.pieceLibrary')}</ModalTitle>
            <CloseButton onClick={closeModal}>{t('common.close')}</CloseButton>
          </ModalHeader>
          
          {selectedPlayer && (
            <PiecesGrid>
              {selectedPlayer.pieces.map(piece => (
                <PieceItem 
                  key={piece.id}
                  isUsed={piece.isUsed}
                  color={PLAYER_COLORS[selectedPlayer.color]}
                >
                  <PieceShape>
                    <PieceGrid 
                      rows={piece.shape.length} 
                      cols={piece.shape[0]?.length || 1}
                    >
                      {piece.shape.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                          <ShapeCell
                            key={`${rowIndex}-${colIndex}`}
                            isFilled={cell === 1}
                          />
                        ))
                      )}
                    </PieceGrid>
                  </PieceShape>
                </PieceItem>
              ))}
            </PiecesGrid>
          )}
        </ModalContent>
      </PiecesModal>
    </>
  );
};

export default AIPlayersInfo;
