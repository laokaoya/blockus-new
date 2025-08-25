// AI玩家信息组件

import React, { useState } from 'react';
import styled from 'styled-components';
import { Player, Piece } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';

interface AIPlayersInfoProps {
  aiPlayers: Player[];
  thinkingAI: string | null;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 250px;
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
`;

const PlayerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
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
`;

const PlayerInfo = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-weight: bold;
  color: #333;
  font-size: 16px;
`;

const PlayerStatus = styled.div<{ isCurrentTurn: boolean; isSettled: boolean; isThinking: boolean }>`
  font-size: 12px;
  color: ${props => {
    if (props.isThinking) return '#ff4444';
    if (props.isSettled) return '#666';
    if (props.isCurrentTurn) return '#FFD700';
    return '#999';
  }};
  font-weight: ${props => (props.isCurrentTurn || props.isThinking) ? 'bold' : 'normal'};
`;

const PlayerStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const Score = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #333;
`;

const RemainingPieces = styled.div`
  font-size: 12px;
  color: #666;
`;

const ViewPiecesButton = styled.button<{ color: string }>`
  background: ${props => PLAYER_COLORS[props.color]};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
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

const AIPlayersInfo: React.FC<AIPlayersInfoProps> = ({ aiPlayers, thinkingAI }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleViewPieces = (player: Player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };
  
  const getStatusText = (player: Player): string => {
    if (player.isSettled) return '已结算';
    if (player.isCurrentTurn) return '当前回合';
    return '等待中';
  };
  
  const getRemainingCount = (player: Player): number => {
    return player.pieces.filter(p => !p.isUsed).length;
  };
  
  return (
    <>
      <Container>
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
                  {thinkingAI === player.color ? '思考中...' : getStatusText(player)}
                </PlayerStatus>
              </PlayerInfo>
            </PlayerHeader>
            
            <PlayerStats>
              <Score>得分: {player.score}</Score>
              <RemainingPieces>
                剩余: {getRemainingCount(player)}块
              </RemainingPieces>
            </PlayerStats>
            
            <ViewPiecesButton 
              color={player.color}
              onClick={() => handleViewPieces(player)}
            >
              查看拼图
            </ViewPiecesButton>
          </PlayerCard>
        ))}
      </Container>
      
      <PiecesModal isOpen={isModalOpen} onClick={closeModal}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>{selectedPlayer?.name}的拼图库</ModalTitle>
            <CloseButton onClick={closeModal}>关闭</CloseButton>
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
