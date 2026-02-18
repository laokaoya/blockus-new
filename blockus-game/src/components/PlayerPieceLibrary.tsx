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
  flex-direction: row;
  align-items: center;
  background: transparent;
  padding: 0 10px;
  width: 100%;
  height: 100%;
  gap: 0;
  
  overflow-x: auto;
  overflow-y: hidden;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

const PiecesGrid = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  height: 100%;
  align-items: center;
  padding: 8px 0;
`;

const PieceItem = styled.div<{ 
  isSelected: boolean; 
  isUsed: boolean; 
  color: string;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 64px;
  background: ${props => props.isUsed ? 'transparent' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.isSelected ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px; /* Slightly sharper corners */
  cursor: ${props => props.isUsed ? 'default' : 'grab'};
  opacity: ${props => props.isUsed ? 0.2 : 1};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  
  /* 选中态发光 */
  box-shadow: ${props => props.isSelected ? `0 0 20px var(--player-${props.color}-glow), inset 0 0 10px var(--player-${props.color}-glow)` : 'none'};
  transform: ${props => props.isSelected ? 'translateY(-10px)' : 'none'};
  
  &:hover {
    transform: ${props => !props.isUsed ? 'translateY(-5px)' : 'none'};
    background: ${props => !props.isUsed ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
    border-color: ${props => !props.isUsed ? 'rgba(255, 255, 255, 0.3)' : 'transparent'};
  }
  
  &:active {
    cursor: grabbing;
    transform: scale(0.95);
  }
`;

const ShapeCell = styled.div<{ isFilled: boolean; color: string }>`
  width: 8px; /* Reduced from 10px */
  height: 8px; /* Reduced from 10px */
  background: ${props => props.isFilled ? `var(--player-${props.color}-main)` : 'transparent'};
  border-radius: 1px;
  box-shadow: ${props => props.isFilled ? `0 0 4px var(--player-${props.color}-glow)` : 'none'};
`;

// 恢复被误删的常量和组件
const CELL_SIZE = 8; /* Reduced from 10 */
const GAP_SIZE = 1;

const PieceShape = styled.div<{ rows: number; cols: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px; /* Reduced from 70px */
  height: 60px; /* Reduced from 70px */
`;

const PieceGrid = styled.div<{ rows: number; cols: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.cols}, ${CELL_SIZE}px);
  grid-template-rows: repeat(${props => props.rows}, ${CELL_SIZE}px);
  gap: ${GAP_SIZE}px;
`;

const PlayerPieceLibrary: React.FC<PlayerPieceLibraryProps> = ({
  player,
  selectedPiece,
  onPieceSelect,
  onStartDrag
}) => {
  const { t } = useLanguage();
  
  const handlePieceClick = (piece: Piece) => {
    if (!piece.isUsed) {
      onPieceSelect(piece);
    }
  };
  
  return (
    <LibraryContainer>
      <PiecesGrid>
        {player.pieces.sort((a, b) => b.type - a.type).map(piece => (
          <PieceItem
            key={piece.id}
            isSelected={selectedPiece?.id === piece.id}
            isUsed={piece.isUsed}
            color={player.color}
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
                      color={player.color}
                    />
                  ))
                )}
              </PieceGrid>
            </PieceShape>
          </PieceItem>
        ))}
      </PiecesGrid>
    </LibraryContainer>
  );
};

export default PlayerPieceLibrary;
