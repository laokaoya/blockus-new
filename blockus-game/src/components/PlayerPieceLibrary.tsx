// 玩家拼图库组件

import React from 'react';
import styled from 'styled-components';
import { Piece, Player } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';
import { useLanguage } from '../contexts/LanguageContext';

interface PlayerPieceLibraryProps {
  player: Player;
  selectedPiece: Piece | null;
  onPieceSelect: (piece: Piece) => void;
  onStartDrag?: (piece: Piece, e: React.MouseEvent) => void;
}

const LibraryContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
  min-width: 300px;
  
  @media (max-width: 1200px) {
    min-width: auto;
    width: 100%;
    max-width: 400px;
  }
  
  @media (max-width: 768px) {
    padding: 15px;
    max-height: 70vh;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    max-height: 60vh;
  }
`;

const LibraryTitle = styled.h3`
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 18px;
    margin: 0 0 15px 0;
  }
  
  @media (max-width: 480px) {
    font-size: 16px;
    margin: 0 0 10px 0;
  }
`;

const ControlsHint = styled.div`
  background: #f0f8ff;
  border: 1px solid #87ceeb;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #333;
  text-align: center;
  
  strong {
    color: #0066cc;
  }
  
  @media (max-width: 768px) {
    padding: 8px;
    margin-bottom: 12px;
    font-size: 11px;
  }
  
  @media (max-width: 480px) {
    padding: 6px;
    margin-bottom: 10px;
    font-size: 10px;
  }
`;

const PieceTypeSection = styled.div`
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 12px;
  }
`;

const TypeTitle = styled.h4<{ color: string }>`
  margin: 0 0 10px 0;
  color: #666;
  font-size: 16px;
  border-bottom: 2px solid ${props => PLAYER_COLORS[props.color as keyof typeof PLAYER_COLORS]};
  padding-bottom: 5px;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin: 0 0 8px 0;
  }
  
  @media (max-width: 480px) {
    font-size: 13px;
    margin: 0 0 6px 0;
  }
`;

const PiecesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
    gap: 6px;
    margin-bottom: 12px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fit, minmax(45px, 1fr));
    gap: 5px;
    margin-bottom: 10px;
  }
`;

const PieceItem = styled.div<{ 
  isSelected: boolean; 
  isUsed: boolean;
  color: string;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: ${props => props.isUsed ? '#ccc' : props.color};
  border: 2px solid ${props => props.isSelected ? '#FFD700' : '#333'};
  border-radius: 4px;
  cursor: ${props => props.isUsed ? 'not-allowed' : 'grab'};
  opacity: ${props => props.isUsed ? 0.5 : 1};
  transition: all 0.2s ease;
  user-select: none;
  
  &:hover {
    transform: ${props => props.isUsed ? 'none' : 'scale(1.05)'};
    box-shadow: ${props => props.isUsed ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.2)'};
  }
  
  &:active {
    cursor: grabbing;
  }
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
  }
  
  @media (max-width: 480px) {
    width: 45px;
    height: 45px;
  }
`;

const CELL_SIZE = 8; // 每个小方格的边长
const GAP_SIZE = 1; // 小方格之间的间距

const PieceShape = styled.div<{ rows: number; cols: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
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

const PieceCount = styled.div`
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 5px;
`;

const PlayerInfo = styled.div<{ color: string }>`
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: ${props => PLAYER_COLORS[props.color as keyof typeof PLAYER_COLORS]};
  border-radius: 8px;
  color: white;
`;

const PlayerName = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const PlayerScore = styled.div`
  font-size: 16px;
`;

const PlayerPieceLibrary: React.FC<PlayerPieceLibraryProps> = ({
  player,
  selectedPiece,
  onPieceSelect,
  onStartDrag
}) => {
  const { t } = useLanguage();
  
  // 按类型分组拼图
  const piecesByType = player.pieces.reduce((acc, piece) => {
    if (!acc[piece.type]) {
      acc[piece.type] = [];
    }
    acc[piece.type].push(piece);
    return acc;
  }, {} as { [key: number]: Piece[] });
  
  // 计算每种类型的剩余数量
  const getRemainingCount = (type: number) => {
    return piecesByType[type]?.filter(p => !p.isUsed).length || 0;
  };
  
  // 计算每种类型的总数量
  const getTotalCount = (type: number) => {
    return piecesByType[type]?.length || 0;
  };
  
  const handlePieceClick = (piece: Piece) => {
    if (!piece.isUsed) {
      onPieceSelect(piece);
    }
  };
  
  return (
    <LibraryContainer>
      <PlayerInfo color={player.color}>
        <PlayerName>{player.name === 'Player' ? t('player.player') : player.name}</PlayerName>
        <PlayerScore>{t('game.score')}: {player.score}</PlayerScore>
      </PlayerInfo>
      
      <LibraryTitle>{t('game.pieceLibrary')}</LibraryTitle>
      
      <ControlsHint>
        <strong>{t('game.operationTips')}：</strong><br />
        {t('game.clickToSelect')} • {t('game.rightKeyRotate')} • {t('game.shiftKeyFlip')}
      </ControlsHint>
      
      {[5, 4, 3, 2, 1].map(type => (
        <PieceTypeSection key={type}>
          <TypeTitle color={player.color}>
            {type}{t('game.blockPiece')} ({getRemainingCount(type)}/{getTotalCount(type)})
          </TypeTitle>
          <PiecesGrid>
            {piecesByType[type]?.map(piece => (
              <PieceItem
                key={piece.id}
                isSelected={selectedPiece?.id === piece.id}
                isUsed={piece.isUsed}
                color={PLAYER_COLORS[player.color]}
                onClick={() => handlePieceClick(piece)}
                onMouseDown={(e) => {
                  if (!piece.isUsed && onStartDrag) {
                    onPieceSelect(piece);
                    onStartDrag(piece, e);
                  }
                }}
              >
                <PieceShape 
                  rows={piece.shape.length} 
                  cols={piece.shape[0]?.length || 1}
                >
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
        </PieceTypeSection>
      ))}
    </LibraryContainer>
  );
};

export default PlayerPieceLibrary;
