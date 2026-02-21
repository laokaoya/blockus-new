// 游戏棋盘组件

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { GameState, Position } from '../types/game';
import { SpecialTile, SpecialTileType } from '../types/creative';
import { canPlacePiece } from '../utils/gameEngine';
import { overlapsBarrier } from '../utils/creativeModeEngine';
import { useLanguage } from '../contexts/LanguageContext';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (position: Position) => void;
  onCellHover: (position: Position) => void;
  onPiecePlace: (position: Position) => void;
  onPieceCancel?: () => void;
  onRotate?: () => void;
  onFlip?: () => void;
  lastAIMove?: Array<{ x: number; y: number }>;
  showHints?: boolean;
  specialTiles?: SpecialTile[]; // 创意模式特殊方格（可选）
}

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  
  width: 100%;
  height: 100%;
  max-width: 80vh; 
  max-height: 80vh;
  aspect-ratio: 1/1;
  
  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 95vw;
  }
`;

// 移除 TrashBin，改为拖拽到区域外或特定区域删除（后续优化）
const TrashBin = styled.div<{ isVisible: boolean; isHovered: boolean }>`
  display: none; 
`;

const BoardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: 1px;
  
  /* 去边框化，增强通透感 */
  background: var(--surface-highlight);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  padding: 2px;
  
  width: 100%;
  height: 100%;
  
  touch-action: none; /* 阻止移动端棋盘区域的默认滚动 */
  
  /* Enhanced glow effect */
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(4px);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 6px;
    background: linear-gradient(45deg, var(--surface-border), transparent 40%, transparent 60%, var(--surface-border));
    z-index: -1;
    pointer-events: none;
  }
`;

// 起始位置颜色映射：0=非起始位置, 1=红, 2=黄, 3=蓝, 4=绿
const STARTING_COLORS: { [key: number]: { bg: string; border: string; glow: string } } = {
  1: { bg: 'rgba(239, 68, 68, 0.15)', border: 'var(--player-red-main)', glow: 'var(--player-red-glow)' },
  2: { bg: 'rgba(234, 179, 8, 0.15)', border: 'var(--player-yellow-main)', glow: 'var(--player-yellow-glow)' },
  3: { bg: 'rgba(59, 130, 246, 0.15)', border: 'var(--player-blue-main)', glow: 'var(--player-blue-glow)' },
  4: { bg: 'rgba(34, 197, 94, 0.15)', border: 'var(--player-green-main)', glow: 'var(--player-green-glow)' },
};

const aiMoveFlash = keyframes`
  0% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
  30% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.4); }
  100% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
`;

const Cell = styled.div<{ 
  isOccupied: boolean; 
  playerColor: number;
  isHighlighted: boolean;
  isInvalid: boolean;
  isPreview: boolean;
  isPreviewValid: boolean;
  isCurrentTurn: boolean;
  startingPlayerColor: number;
  isRecentAIMove: boolean;
}>`
  width: 100%;
  height: 100%;
  border-radius: 1px;
  
  /* 基础网格线 */
  box-shadow: inset 0 0 0 0.5px var(--surface-border);
  
  background: ${props => {
    if (props.isOccupied) {
      // 占位格子：发光渐变
      const colors = ['transparent', 'var(--player-red-main)', 'var(--player-yellow-main)', 'var(--player-blue-main)', 'var(--player-green-main)'];
      return colors[props.playerColor] || '#ccc';
    }
    if (props.isHighlighted) return 'rgba(16, 185, 129, 0.4)';
    if (props.isInvalid) return 'rgba(239, 68, 68, 0.3)';
    if (props.isPreview && props.isPreviewValid) return 'rgba(16, 185, 129, 0.25)';
    if (props.isPreview && !props.isPreviewValid) return 'rgba(239, 68, 68, 0.2)';
    
    // 起始点标记
    if (props.startingPlayerColor > 0) {
      return STARTING_COLORS[props.startingPlayerColor]?.bg || 'rgba(255, 215, 0, 0.1)';
    }
    
    return 'transparent'; // 空格子完全透明
  }};
  
  /* 占位格子特效 */
  ${props => props.isOccupied && `
    box-shadow: 0 0 8px ${
      props.playerColor === 1 ? 'var(--player-red-glow)' :
      props.playerColor === 2 ? 'var(--player-yellow-glow)' :
      props.playerColor === 3 ? 'var(--player-blue-glow)' :
      props.playerColor === 4 ? 'var(--player-green-glow)' : 'none'
    }, inset 0 0 4px rgba(255,255,255,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 1;
  `}
  
  cursor: ${props => (props.isHighlighted || (props.isPreview && props.isPreviewValid)) ? 'pointer' : 'default'};
  transition: all 0.15s ease;
  
  ${props => props.isRecentAIMove && css`animation: ${aiMoveFlash} 1.2s ease-out;`}
  
  &:hover {
    background: ${props => !props.isOccupied && !props.isHighlighted ? 'rgba(255, 255, 255, 0.05)' : ''};
  }
`;

// --- 创意模式特殊方格覆盖层 ---
const SPECIAL_TILE_STYLES: Record<SpecialTileType, { bg: string; icon: string; color: string; border: string; solid?: boolean }> = {
  gold:    { bg: 'var(--tile-gold-bg)', icon: '★', color: 'var(--tile-gold-text)', border: 'var(--tile-gold-border)' },
  purple:  { bg: 'var(--tile-purple-bg)', icon: '?', color: 'var(--tile-purple-text)', border: 'var(--tile-purple-border)' },
  red:     { bg: 'var(--tile-red-bg)', icon: '!', color: 'var(--tile-red-text)', border: 'var(--tile-red-border)' },
  barrier: { bg: 'var(--tile-barrier-bg)', icon: '×', color: 'var(--tile-barrier-text)', border: 'var(--tile-barrier-border)', solid: true },
};

const specialPulse = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

const SpecialTileOverlay = styled.div<{ tileType: SpecialTileType }>`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => SPECIAL_TILE_STYLES[props.tileType].bg};
  border: 1px solid ${props => SPECIAL_TILE_STYLES[props.tileType].border};
  border-radius: 2px;
  pointer-events: none;
  z-index: 2;
  ${props => props.tileType !== 'barrier' && css`
    animation: ${specialPulse} 2s ease-in-out infinite;
  `}
  
  &::after {
    content: '${props => SPECIAL_TILE_STYLES[props.tileType].icon}';
    color: ${props => SPECIAL_TILE_STYLES[props.tileType].color};
    font-size: ${props => props.tileType === 'barrier' ? '0.8em' : '0.6em'};
    font-weight: 900;
    text-shadow: ${props => props.tileType === 'barrier'
      ? 'none'
      : `0 0 4px ${SPECIAL_TILE_STYLES[props.tileType].color}`};
    line-height: 1;
  }
`;

const COVERED_GLOW: Record<SpecialTileType, string> = {
  gold: 'rgba(251,191,36,0.4)',
  purple: 'rgba(139,92,246,0.4)',
  red: 'rgba(248,113,113,0.4)',
  barrier: 'rgba(107,114,128,0.3)',
};

/** 已覆盖的特殊格子：仅保留边缘发光，体现曾为特殊格 */
const CoveredSpecialTileGlow = styled.div<{ tileType: SpecialTileType }>`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: 2px;
  border: 2px solid ${props => SPECIAL_TILE_STYLES[props.tileType].border};
  box-shadow: inset 0 0 8px ${props => COVERED_GLOW[props.tileType]}, 0 0 6px ${props => SPECIAL_TILE_STYLES[props.tileType].border};
  background: transparent;
`;

const CellWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;



const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  onCellClick, 
  onCellHover,
  onPiecePlace,
  onPieceCancel,
  onRotate,
  onFlip,
  lastAIMove = [],
  specialTiles,
}) => {
  const { t } = useLanguage();
  const { board, players, currentPlayerIndex, selectedPiece } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'none' | 'dragging' | 'placing'>('none');
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [, setOriginalPiecePosition] = useState<Position | null>(null);
  
  // 悬停预览状态
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);

  // 触摸交互标记：防止移动端 touch 后的兼容性 mouse 事件干扰
  const isTouchActiveRef = useRef(false);
  const touchDragActive = useRef(false);
  
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
      const { clientX, clientY } = e.detail;
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

  // Safety check
  if (!currentPlayer) {
    return null;
  }
  
  // 检查拼图是否可以放置在指定位置
  const canPlaceAt = (x: number, y: number): boolean => {
    if (!selectedPiece) return false;
    
    const colorIndex = currentPlayerIndex + 1;
    if (!canPlacePiece(board, selectedPiece, { x, y }, colorIndex)) return false;
    // 创意模式：禁止放置到屏障格
    if (specialTiles?.length && overlapsBarrier(selectedPiece.shape, { x, y }, specialTiles)) return false;
    return true;
  };
  
  // 开始拖拽（仅桌面端鼠标）
  const startDrag = (x: number, y: number, e: React.MouseEvent) => {
    if (isTouchActiveRef.current) return;
    if (!selectedPiece) return;
    
    setIsDragging(true);
    setDragMode('dragging');
    setMousePosition({ x, y });
  };
  
  // 从拼图库开始拖拽
  const startDragFromLibrary = (e: React.MouseEvent) => {
    if (!selectedPiece) return;
    
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
    // 触摸交互期间跳过浏览器合成的 click 事件，避免重复放置
    if (isTouchActiveRef.current) return;

    if (dragMode === 'dragging' && selectedPiece) {
      if (canPlaceAt(x, y)) {
        onPiecePlace({ x, y });
        setIsDragging(false);
        setDragMode('none');
      }
    } else if (!isDragging && selectedPiece) {
      if (canPlaceAt(x, y)) {
        onPiecePlace({ x, y });
        setHoverPosition(null);
      }
    } else if (!isDragging) {
      onCellClick({ x, y });
    }
  };
  
  const handleCellClick = (x: number, y: number) => {
    if (isDragging) return;
    onCellClick({ x, y });
  };
  
  const handleCellHover = (x: number, y: number) => {
    if (isDragging || isTouchActiveRef.current) return;
    setHoverPosition({ x, y });
    onCellHover({ x, y });
  };
  
  // 鼠标离开棋盘时清除预览
  const handleBoardLeave = () => {
    setHoverPosition(null);
  };

  // ===== 触摸事件处理（移动端） =====
  const TOUCH_Y_OFFSET_PX = 80;

  const touchToBoardPos = (touch: React.Touch, grid: Element, applyOffset: boolean): Position | null => {
    const rect = grid.getBoundingClientRect();
    const cellSize = rect.width / 20;
    const rawX = (touch.clientX - rect.left) / cellSize;
    const rawY = (touch.clientY - rect.top - (applyOffset ? TOUCH_Y_OFFSET_PX : 0)) / cellSize;
    const x = Math.max(0, Math.min(19, Math.floor(rawX)));
    const y = Math.max(0, Math.min(19, Math.floor(rawY)));
    if (rawX < -1 || rawX > 21 || rawY < -2 || rawY > 21) return null;
    return { x, y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!selectedPiece || e.touches.length !== 1) return;
    e.preventDefault();
    isTouchActiveRef.current = true;
    touchDragActive.current = false;
    if (dragMode !== 'none') {
      setDragMode('none');
      setIsDragging(false);
    }
    const pos = touchToBoardPos(e.touches[0], e.currentTarget, true);
    if (pos) {
      setHoverPosition(pos);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!selectedPiece || e.touches.length !== 1) return;
    e.preventDefault();
    touchDragActive.current = true;
    const pos = touchToBoardPos(e.touches[0], e.currentTarget, true);
    if (pos) {
      setHoverPosition(pos);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!selectedPiece || !hoverPosition) {
      setTimeout(() => { isTouchActiveRef.current = false; }, 400);
      touchDragActive.current = false;
      return;
    }
    if (canPlaceAt(hoverPosition.x, hoverPosition.y)) {
      onPiecePlace(hoverPosition);
    }
    setHoverPosition(null);
    touchDragActive.current = false;
    setTimeout(() => { isTouchActiveRef.current = false; }, 400);
  };
  
  // 右键旋转拼图
  const handleContextMenu = (e: React.MouseEvent) => {
    if (selectedPiece) {
      e.preventDefault();
      if (onRotate) onRotate();
    }
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
  
  // 检查位置是否在悬停预览范围内（选中拼图但未拖拽时）
  const isInHoverPreview = (x: number, y: number): boolean => {
    if (dragMode !== 'none' || !selectedPiece || !hoverPosition) return false;
    return isPositionInPiece(x, y, hoverPosition.x, hoverPosition.y);
  };

  // 悬停预览位置是否可放置
  const isHoverPositionValid = (): boolean => {
    if (!hoverPosition || !selectedPiece) return false;
    return canPlaceAt(hoverPosition.x, hoverPosition.y);
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

  // 获取起始位置对应的玩家颜色索引（0=非起始, 1=红, 2=黄, 3=蓝, 4=绿）
  // 只有未被占据的起始角落才显示标记
  const getStartingPlayerColor = (x: number, y: number): number => {
    if (board[y][x] !== 0) return 0;
    const size = board.length;
    if (x === 0 && y === 0) return 1;           // 红色 - 左上角
    if (x === size - 1 && y === 0) return 2;     // 黄色 - 右上角
    if (x === size - 1 && y === size - 1) return 3; // 蓝色 - 右下角
    if (x === 0 && y === size - 1) return 4;     // 绿色 - 左下角
    return 0;
  };
  
    return (
    <BoardContainer>
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
        onMouseUp={endDrag}
        onMouseLeave={handleBoardLeave}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {board.map((row, y) =>
          row.map((cell, x) => {
            const specialTile = specialTiles?.find(t => t.x === x && t.y === y);
            const unusedTile = specialTile && !specialTile.used;
            const coveredTile = specialTile && specialTile.used && cell !== 0;
            return (
              <CellWrapper key={`${x}-${y}`}>
                <Cell
                  isOccupied={cell !== 0}
                  playerColor={cell}
                  isHighlighted={shouldHighlight(x, y)}
                  isInvalid={shouldShowInvalid(x, y)}
                  isPreview={isInHoverPreview(x, y)}
                  isPreviewValid={isHoverPositionValid()}
                  isCurrentTurn={currentPlayer?.isCurrentTurn ?? false}
                  startingPlayerColor={getStartingPlayerColor(x, y)}
                  isRecentAIMove={lastAIMove.some(m => m.x === x && m.y === y)}
                  onClick={() => handleBoardClick(x, y)}
                  onMouseEnter={() => handleCellHover(x, y)}
                  onMouseDown={(e) => startDrag(x, y, e)}
                />
                {unusedTile && cell === 0 && (
                  <SpecialTileOverlay tileType={specialTile.type} />
                )}
                {coveredTile && specialTile.type !== 'barrier' && (
                  <CoveredSpecialTileGlow tileType={specialTile.type} />
                )}
              </CellWrapper>
            );
          })
        )}
      </BoardGrid>
    </BoardContainer>
  );
};

export default GameBoard;