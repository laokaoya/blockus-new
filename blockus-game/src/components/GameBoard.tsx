// 游戏棋盘组件

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GameState, Position, Piece } from '../types/game';
import { canPlacePiece } from '../utils/gameEngine';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (position: Position) => void;
  onCellHover: (position: Position) => void;
  onPiecePlace: (position: Position) => void;
}

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const BoardTitle = styled.h2`
  margin: 0 0 20px 0;
  color: #333;
  font-size: 24px;
`;

const BoardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  background: #ccc;
  border: 2px solid #333;
  width: 600px;
  height: 600px;
  max-width: 90vw;
  max-height: 90vw;
`;

const Cell = styled.div<{ 
  isOccupied: boolean; 
  playerColor: number;
  isHighlighted: boolean;
  isCurrentTurn: boolean;
}>`
  width: 100%;
  height: 100%;
  background: ${props => {
    if (props.isOccupied) {
      const colors = ['transparent', '#FF4444', '#FFDD44', '#4444FF', '#44FF44'];
      return colors[props.playerColor] || '#ccc';
    }
    if (props.isHighlighted) {
      return 'rgba(255, 255, 0, 0.3)';
    }
    if (props.isCurrentTurn) {
      return 'rgba(0, 255, 0, 0.1)';
    }
    return '#fff';
  }};
  border: ${props => props.isHighlighted ? '2px solid #FFD700' : '1px solid #ddd'};
  cursor: ${props => props.isHighlighted ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: ${props => props.isHighlighted ? 'scale(1.1)' : 'scale(1)'};
    box-shadow: ${props => props.isHighlighted ? '0 0 8px rgba(255, 215, 0, 0.6)' : 'none'};
  }
`;

// 跟随鼠标的拼图预览
const DraggingPiecePreview = styled.div<{ 
  x: number; 
  y: number; 
  isVisible: boolean;
}>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  pointer-events: none;
  opacity: ${props => props.isVisible ? 0.7 : 0};
  transition: opacity 0.1s ease;
  z-index: 1000;
`;

const PreviewPieceShape = styled.div<{ rows: number; cols: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.cols}, 20px);
  grid-template-rows: repeat($props => props.rows}, 20px);
  gap: 1px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #FFD700;
  border-radius: 4px;
  padding: 2px;
`;

const PreviewCell = styled.div<{ isFilled: boolean }>`
  width: 20px;
  height: 20px;
  background: ${props => props.isFilled ? '#FF4444' : 'transparent'};
  border-radius: 2px;
`;

const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  onCellClick, 
  onCellHover,
  onPiecePlace
}) => {
  const { board, players, currentPlayerIndex, selectedPiece } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [mouseScreenPosition, setMouseScreenPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  // 检查拼图是否可以放置在指定位置
  const canPlaceAt = (x: number, y: number): boolean => {
    if (!selectedPiece || currentPlayer.color !== 'red') return false;
    
    const colorIndex = currentPlayerIndex + 1;
    return canPlacePiece(board, selectedPiece, { x, y }, colorIndex);
  };
  
  // 开始拖拽
  const startDrag = (x: number, y: number, e: React.MouseEvent) => {
    if (!selectedPiece || currentPlayer.color !== 'red') return;
    
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
    setMousePosition({ x, y });
    setMouseScreenPosition({ x: e.clientX, y: e.clientY });
  };
  
  // 拖拽中
  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 20));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 20));
    
    setMousePosition({ x, y });
    setMouseScreenPosition({ x: e.clientX, y: e.clientY });
  };
  
  // 结束拖拽
  const endDrag = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // 检查是否可以放置
    if (canPlaceAt(mousePosition.x, mousePosition.y)) {
      onPiecePlace(mousePosition);
    }
  };
  
  const handleCellClick = (x: number, y: number) => {
    if (isDragging) return;
    onCellClick({ x, y });
  };
  
  const handleCellHover = (x: number, y: number) => {
    if (isDragging) return;
    onCellHover({ x, y });
  };
  
  // 检查位置是否在拼图范围内
  const isPositionInPiece = (x: number, y: number, pieceX: number, pieceY: number): boolean => {
    if (!selectedPiece) return false;
    
    const { shape } = selectedPiece;
    const relativeX = x - pieceX;
    const relativeY = y - pieceY;
    
    return relativeY >= 0 && relativeY < shape.length && 
           relativeX >= 0 && relativeX < shape[0]?.length && 
           shape[relativeY][relativeX] === 1;
  };
  
  return (
    <BoardContainer>
      <BoardTitle>
        {currentPlayer.name}的回合
        {currentPlayer.color === 'red' && ` - 剩余时间: ${gameState.timeLeft}秒`}
      </BoardTitle>
      <BoardGrid
        onMouseMove={handleDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {board.map((row, y) =>
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              isOccupied={cell !== 0}
              playerColor={cell}
              isHighlighted={isDragging && canPlaceAt(mousePosition.x, mousePosition.y) && 
                isPositionInPiece(x, y, mousePosition.x, mousePosition.y)}
              isCurrentTurn={currentPlayer.isCurrentTurn}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => handleCellHover(x, y)}
              onMouseDown={(e) => startDrag(x, y, e)}
            />
          ))
        )}
      </BoardGrid>
      
      {/* 跟随鼠标的拼图预览 */}
      {