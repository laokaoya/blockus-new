// 游戏棋盘组件

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GameState, Position, Piece } from '../types/game';
import { canPlacePiece } from '../utils/gameEngine';
import { useLanguage } from '../contexts/LanguageContext';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (position: Position) => void;
  onCellHover: (position: Position) => void;
  onPiecePlace: (position: Position) => void;
  onPieceCancel?: () => void;
  showHints?: boolean;
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
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

// 垃圾桶图标
const TrashBin = styled.div<{ isVisible: boolean; isHovered: boolean }>`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: ${props => props.isHovered ? '#ff6b6b' : '#ff4757'};
  border-radius: 8px;
  display: ${props => props.isVisible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }
  
  &::before {
    content: '🗑️';
    font-size: 24px;
    color: white;
  }
  
  @media (max-width: 768px) {
    top: 15px;
    right: 15px;
    width: 40px;
    height: 40px;
    
    &::before {
      font-size: 20px;
    }
  }
  
  @media (max-width: 480px) {
    top: 10px;
    right: 10px;
    width: 35px;
    height: 35px;
    
    &::before {
      font-size: 18px;
    }
  }
`;

const BoardTitle = styled.h2`
  margin: 0 0 20px 0;
  color: #333;
  font-size: 24px;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin: 0 0 15px 0;
  }
  
  @media (max-width: 480px) {
    font-size: 18px;
    margin: 0 0 10px 0;
  }
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
  
  @media (max-width: 768px) {
    width: 400px;
    height: 400px;
    max-width: 85vw;
    max-height: 85vw;
  }
  
  @media (max-width: 480px) {
    width: 300px;
    height: 300px;
    max-width: 80vw;
    max-height: 80vw;
  }
`;

const Cell = styled.div<{ 
  isOccupied: boolean; 
  playerColor: number;
  isHighlighted: boolean;
  isInvalid: boolean;
  isCurrentTurn: boolean;
  isStartingPosition: boolean;
}>`
  width: 100%;
  height: 100%;
  background: ${props => {
    if (props.isOccupied) {
      const colors = ['transparent', '#FF4444', '#FFDD44', '#4444FF', '#44FF44'];
      return colors[props.playerColor] || '#ccc';
    }
    if (props.isStartingPosition) {
      return 'rgba(255, 215, 0, 0.3)'; // 起始位置 - 金色半透明
    }
    if (props.isHighlighted) {
      return 'rgba(255, 255, 0, 0.3)';
    }
    if (props.isInvalid) {
      return 'rgba(255, 0, 0, 0.2)';
    }
    if (props.isCurrentTurn) {
      return 'rgba(0, 255, 0, 0.1)';
    }
    return '#fff';
  }};
  border: ${props => {
    if (props.isStartingPosition) return '2px solid #FFD700'; // 起始位置 - 金色边框
    if (props.isHighlighted) return '2px solid #FFD700';
    if (props.isInvalid) return '2px solid #FF4444';
    return '1px solid #ddd';
  }};
  cursor: ${props => props.isHighlighted ? 'pointer' : 'default'};
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    transform: ${props => props.isHighlighted ? 'scale(1.1)' : 'scale(1)'};
    box-shadow: ${props => props.isHighlighted ? '0 0 8px rgba(255, 215, 0, 0.6)' : 'none'};
  }
  
  ${props => props.isStartingPosition && `
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
    animation: glow 2s ease-in-out infinite alternate;
    
    @keyframes glow {
      from {
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
      }
      to {
        box-shadow: 0 0 25px rgba(255, 215, 0, 1), 0 0 35px rgba(255, 215, 0, 0.6);
      }
    }
  `}
`;



const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  onCellClick, 
  onCellHover,
  onPiecePlace,
  onPieceCancel
}) => {
  const { t } = useLanguage();
  const { board, players, currentPlayerIndex, selectedPiece } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'none' | 'dragging' | 'placing'>('none');
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [originalPiecePosition, setOriginalPiecePosition] = useState<Position | null>(null);
  
  // 全局鼠标事件监听
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragMode === 'dragging' && selectedPiece) {
        // 计算棋盘上的位置
        const boardElement = document.querySelector('[data-board-grid]');
        if (boardElement) {
          const rect = boardElement.getBoundingClientRect();
          const x = Math.floor((e.clientX - rect.left) / (rect.width / 20));
          const y = Math.floor((e.clientY - rect.top) / (rect.height / 20));
          
          if (x >= 0 && x < 20 && y >= 0 && y < 20) {
            setMousePosition({ x, y });
          }
        }
      }
    };
    
    const handleStartDragFromLibrary = (e: CustomEvent) => {
      const { piece, clientX, clientY } = e.detail;
      setIsDragging(true);
      setDragMode('dragging');
      
      // 计算棋盘上的初始位置
      const boardElement = document.querySelector('[data-board-grid]');
      if (boardElement) {
        const rect = boardElement.getBoundingClientRect();
        const x = Math.floor((clientX - rect.left) / (rect.width / 20));
        const y = Math.floor((clientY - rect.top) / (rect.height / 20));
        setMousePosition({ x, y });
      }
    };
    
    if (dragMode === 'dragging') {
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }
    
    // 监听从拼图库开始的拖拽
    const boardElement = document.querySelector('[data-board-grid]');
    if (boardElement) {
      boardElement.addEventListener('startDragFromLibrary', handleStartDragFromLibrary as EventListener);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      if (boardElement) {
        boardElement.removeEventListener('startDragFromLibrary', handleStartDragFromLibrary as EventListener);
      }
    };
  }, [dragMode, selectedPiece]);
  
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
    setDragMode('dragging');
    setMousePosition({ x, y });
  };
  
  // 从拼图库开始拖拽
  const startDragFromLibrary = (e: React.MouseEvent) => {
    if (!selectedPiece || currentPlayer.color !== 'red') return;
    
    setIsDragging(true);
    setDragMode('dragging');
    
    // 记录原始位置（拼图库中的位置）
    setOriginalPiecePosition({ x: -1, y: -1 }); // -1 表示在拼图库中
    
    // 计算棋盘上的初始位置
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 20));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 20));
    setMousePosition({ x, y });
  };
  
  // 拖拽中
  const handleDrag = (e: React.MouseEvent) => {
    if (dragMode !== 'dragging') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 20));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 20));
    
    setMousePosition({ x, y });
  };
  
  // 结束拖拽
  const endDrag = () => {
    if (dragMode !== 'dragging') return;
    
    setIsDragging(false);
    setDragMode('none');
    
    // 检查是否可以放置
    if (canPlaceAt(mousePosition.x, mousePosition.y)) {
      onPiecePlace(mousePosition);
    }
  };
  
  // 处理棋盘点击（放置拼图）
  const handleBoardClick = (x: number, y: number) => {
    if (dragMode === 'dragging' && selectedPiece) {
      // 如果正在拖拽，点击就放置
      if (canPlaceAt(x, y)) {
        onPiecePlace({ x, y });
        setIsDragging(false);
        setDragMode('none');
      }
    } else if (!isDragging) {
      // 如果没有拖拽，正常处理点击
      onCellClick({ x, y });
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
  
  // 检查位置是否应该高亮（可放置）
  const shouldHighlight = (x: number, y: number): boolean => {
    if (dragMode !== 'dragging' || !selectedPiece) return false;
    
    return isPositionInPiece(x, y, mousePosition.x, mousePosition.y) && 
           canPlaceAt(mousePosition.x, mousePosition.y);
  };
  
  // 检查位置是否应该显示无效提示（不可放置）
  const shouldShowInvalid = (x: number, y: number): boolean => {
    if (dragMode !== 'dragging' || !selectedPiece) return false;
    
    return isPositionInPiece(x, y, mousePosition.x, mousePosition.y) && 
           !canPlaceAt(mousePosition.x, mousePosition.y);
  };
  
  // 处理垃圾桶点击（退回拼图）
  const handleTrashClick = () => {
    if (dragMode === 'dragging' && selectedPiece) {
      // 将拼图退回到原位置
      setIsDragging(false);
      setDragMode('none');
      setOriginalPiecePosition(null);
      
      // 通知父组件取消选择
      if (onPieceCancel) {
        onPieceCancel();
      }
    }
  };
  
  // 处理垃圾桶悬停
  const handleTrashHover = (isHovered: boolean) => {
    setIsTrashHovered(isHovered);
  };
  
    return (
    <BoardContainer>
      <BoardTitle>
        {currentPlayer.name === 'Player' ? t('player.player') : currentPlayer.name} {t('game.turn')}
        {currentPlayer.color === 'red' && ` - ${t('game.timeLeft')}: ${gameState.timeLeft}${t('settings.seconds')}`}
      </BoardTitle>
      
      {/* 垃圾桶图标 */}
      <TrashBin
        isVisible={dragMode === 'dragging'}
        isHovered={isTrashHovered}
        onClick={handleTrashClick}
        onMouseEnter={() => handleTrashHover(true)}
        onMouseLeave={() => handleTrashHover(false)}
        title={t('controls.trash')}
      />
      
      <BoardGrid
        data-board-grid
        onMouseMove={handleDrag}
      >
        {board.map((row, y) =>
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              isOccupied={cell !== 0}
              playerColor={cell}
              isHighlighted={shouldHighlight(x, y)}
              isInvalid={shouldShowInvalid(x, y)}
              isCurrentTurn={currentPlayer.isCurrentTurn}
              isStartingPosition={x === 0 && y === 0} // 左上角为起始位置
              onClick={() => handleBoardClick(x, y)}
              onMouseEnter={() => handleCellHover(x, y)}
              onMouseDown={(e) => startDrag(x, y, e)}
            />
          ))
        )}
      </BoardGrid>
    </BoardContainer>
  );
};

export default GameBoard;
