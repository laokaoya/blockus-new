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

  @media (max-width: 768px) {
    /* 移动端禁用 backdrop-filter 以减轻 GPU 负担，缓解放置卡顿 */
    backdrop-filter: none;
  }
  
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
      const colors = ['transparent', 'var(--player-red-main)', 'var(--player-yellow-main)', 'var(--player-blue-main)', 'var(--player-green-main)'];
      return colors[props.playerColor] || '#ccc';
    }
    if (props.startingPlayerColor > 0) {
      return STARTING_COLORS[props.startingPlayerColor]?.bg || 'rgba(255, 215, 0, 0.1)';
    }
    return 'transparent';
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
  
  cursor: default;
  transition: all 0.15s ease;
  
  ${props => props.isRecentAIMove && css`animation: ${aiMoveFlash} 1.2s ease-out;`}
  
  &:hover {
    background: ${props => !props.isOccupied ? 'rgba(255, 255, 255, 0.05)' : ''};
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
  gold: 'rgba(251,191,36,0.6)',
  purple: 'rgba(139,92,246,0.6)',
  red: 'rgba(248,113,113,0.6)',
  barrier: 'rgba(107,114,128,0.3)',
};

/** 已覆盖的特殊格子：仅保留边缘发光，体现曾为特殊格 */
const CoveredSpecialTileGlow = styled.div<{ tileType: SpecialTileType }>`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 3;
  border-radius: 2px;
  border: 2px solid ${props => SPECIAL_TILE_STYLES[props.tileType].border};
  box-shadow: inset 0 0 12px ${props => COVERED_GLOW[props.tileType]}, 0 0 12px ${props => COVERED_GLOW[props.tileType]}, 0 0 8px ${props => SPECIAL_TILE_STYLES[props.tileType].border};
  background: transparent;
`;

const CellWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

/** 放置预览影子：置于最上层，不被特殊格/已放置方块遮挡 */
const PreviewOverlay = styled.div<{ $valid: boolean }>`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: 2px;
  background: ${p => p.$valid ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.35)'};
  box-shadow: 0 0 8px ${p => p.$valid ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.5)'};
`;

/** 独立预览层：仅渲染拼图形状，避免 400 格重渲染导致移动端卡死 */
const PiecePreviewLayer = styled.div`
  position: absolute;
  inset: 2px;
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  grid-template-rows: repeat(20, minmax(0, 1fr));
  gap: 1px;
  pointer-events: none;
  z-index: 10;
  overflow: visible;
`;

const PiecePreviewCell = styled.div<{ $valid: boolean }>`
  background: ${p => p.$valid ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.35)'};
  box-shadow: 0 0 8px ${p => p.$valid ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.5)'};
  border-radius: 1px;
  min-width: 2px;
  min-height: 2px;
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
  const lastTouchPosRef = useRef<Position | null>(null);
  const pendingTouchPosRef = useRef<Position | null>(null);

  // 拖拽时最新位置（用于全局 mouseup，因释放在棋盘外时 BoardGrid.onMouseUp 不触发）
  const mousePositionRef = useRef<Position>({ x: 0, y: 0 });
  const dragHandledRef = useRef(false); // 防止 BoardGrid.onMouseUp 与 document.mouseup 重复处理

  // 全局鼠标事件监听
  useEffect(() => {
    const clientToCell = (cx: number, cy: number, rect: DOMRect): { x: number; y: number } | null => {
      const inset = 3; // BoardGrid border 1px + padding 2px
      const gap = 1;
      const innerW = rect.width - inset * 2;
      const innerH = rect.height - inset * 2;
      const cellW = (innerW - gap * 19) / 20;
      const cellH = (innerH - gap * 19) / 20;
      if (cellW <= 0 || cellH <= 0) return null;
      const x = Math.floor((cx - rect.left - inset) / cellW);
      const y = Math.floor((cy - rect.top - inset) / cellH);
      if (x >= 0 && x < 20 && y >= 0 && y < 20) return { x, y };
      return null;
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragMode === 'dragging' && selectedPiece) {
        const boardElement = document.querySelector('[data-board-grid]');
        if (boardElement) {
          const pos = clientToCell(e.clientX, e.clientY, boardElement.getBoundingClientRect());
          if (pos) {
            mousePositionRef.current = pos;
            setMousePosition(pos);
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragMode !== 'dragging') return;
      if (dragHandledRef.current) return; // BoardGrid.onMouseUp 已处理，避免重复放置
      dragHandledRef.current = true;
      const pos = mousePositionRef.current;
      if (selectedPiece && canPlaceAt(pos.x, pos.y)) {
        onPiecePlace(pos);
      }
      setIsDragging(false);
      setDragMode('none');
    };
    
    const handleStartDragFromLibrary = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || typeof detail.clientX !== 'number' || typeof detail.clientY !== 'number') return;
      const { clientX, clientY } = detail;
      dragHandledRef.current = false;
      setIsDragging(true);
      setDragMode('dragging');
      
      const boardElement = document.querySelector('[data-board-grid]');
      const invalidPos = { x: -1, y: -1 }; // 点击在棋盘外时不显示预览，避免误用默认 (0,0)
      if (boardElement) {
        const pos = clientToCell(clientX, clientY, boardElement.getBoundingClientRect());
        if (pos) {
          mousePositionRef.current = pos;
          setMousePosition(pos);
        } else {
          mousePositionRef.current = invalidPos;
          setMousePosition(invalidPos);
        }
      }
    };
    
    if (dragMode === 'dragging') {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    // 监听从拼图库开始的拖拽
    const boardElement = document.querySelector('[data-board-grid]');
    if (boardElement) {
      boardElement.addEventListener('startDragFromLibrary', handleStartDragFromLibrary as EventListener);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
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
    
    const pos = { x, y };
    mousePositionRef.current = pos;
    dragHandledRef.current = false;
    setIsDragging(true);
    setDragMode('dragging');
    setMousePosition(pos);
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
  
  // 拖拽中（与 clientToCell 逻辑一致，保证影子完整）
  const handleDrag = (e: React.MouseEvent) => {
    if (dragMode !== 'dragging') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const inset = 3; // BoardGrid border 1px + padding 2px
    const gap = 1;
    const innerW = rect.width - inset * 2;
    const innerH = rect.height - inset * 2;
    const cellW = (innerW - gap * 19) / 20;
    const cellH = (innerH - gap * 19) / 20;
    if (cellW <= 0 || cellH <= 0) return;
    const x = Math.max(0, Math.min(19, Math.floor((e.clientX - rect.left - inset) / cellW)));
    const y = Math.max(0, Math.min(19, Math.floor((e.clientY - rect.top - inset) / cellH)));
    const pos = { x, y };
    mousePositionRef.current = pos;
    setMousePosition(pos);
  };
  
  // 结束拖拽
  const endDrag = () => {
    if (dragMode !== 'dragging') return;
    if (dragHandledRef.current) return; // 全局 mouseup 已处理
    dragHandledRef.current = true;
    setIsDragging(false);
    setDragMode('none');
    const pos = mousePositionRef.current;
    if (canPlaceAt(pos.x, pos.y)) {
      onPiecePlace(pos);
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
      const placePos = (hoverPosition && isInHoverPreview(x, y)) ? hoverPosition : { x, y };
      if (canPlaceAt(placePos.x, placePos.y)) {
        onPiecePlace(placePos);
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
  // 优先用 elementFromPoint 获取触摸下的格子，避免 clientX/Y 与 getBoundingClientRect 在部分移动端的坐标系偏差
  const touchToBoardPos = (touch: React.Touch, grid: Element): Position | null => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const cell = el.closest('[data-cell-x][data-cell-y]');
      if (cell) {
        const x = parseInt(cell.getAttribute('data-cell-x') ?? '', 10);
        const y = parseInt(cell.getAttribute('data-cell-y') ?? '', 10);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x < 20 && y >= 0 && y < 20) {
          return { x, y };
        }
      }
    }
    // 回退：坐标计算（BoardGrid border 1px + padding 2px）
    const rect = grid.getBoundingClientRect();
    const GRID_INSET = 3;
    const gap = 1;
    const innerW = rect.width - GRID_INSET * 2;
    const innerH = rect.height - GRID_INSET * 2;
    const cellW = (innerW - gap * 19) / 20;
    const cellH = (innerH - gap * 19) / 20;
    if (cellW <= 0 || cellH <= 0) return null;
    const x = Math.floor((touch.clientX - rect.left - GRID_INSET) / cellW);
    const y = Math.floor((touch.clientY - rect.top - GRID_INSET) / cellH);
    if (x >= 0 && x < 20 && y >= 0 && y < 20) return { x, y };
    return null;
  };

  // 移动端：影子显示在手指上方 2-3 格，避免被手指遮挡
  const TOUCH_PREVIEW_Y_OFFSET = 2;
  const getDisplayPosition = (pos: Position, isTouch: boolean): Position => {
    if (!isTouch) return pos;
    return { x: pos.x, y: Math.max(0, pos.y - TOUCH_PREVIEW_Y_OFFSET) };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!selectedPiece || e.touches.length !== 1) return;
    e.preventDefault();
    isTouchActiveRef.current = true;
    touchDragActive.current = false;
    lastTouchPosRef.current = null;
    pendingTouchPosRef.current = null;
    if (dragMode !== 'none') {
      setDragMode('none');
      setIsDragging(false);
    }
    const pos = touchToBoardPos(e.touches[0], e.currentTarget);
    if (pos) {
      lastTouchPosRef.current = pos;
      setHoverPosition(pos);
    } else {
      setHoverPosition(null);
      lastTouchPosRef.current = null;
      pendingTouchPosRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!selectedPiece || e.touches.length !== 1) return;
    e.preventDefault();
    touchDragActive.current = true;
    const pos = touchToBoardPos(e.touches[0], e.currentTarget);
    if (!pos) return;
    if (lastTouchPosRef.current && lastTouchPosRef.current.x === pos.x && lastTouchPosRef.current.y === pos.y) return;
    lastTouchPosRef.current = pos;
    pendingTouchPosRef.current = pos;
    setHoverPosition(pos);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 优先用 ref（同步更新），hoverPosition 可能因 React 批处理尚未更新导致放置失败
    const fingerPos = pendingTouchPosRef.current ?? lastTouchPosRef.current ?? hoverPosition;
    lastTouchPosRef.current = null;
    pendingTouchPosRef.current = null;
    if (!selectedPiece || !fingerPos) {
      setTimeout(() => { isTouchActiveRef.current = false; }, 400);
      touchDragActive.current = false;
      return;
    }
    // 触摸时放置位置与预览一致：使用 displayPos（手指上方 2 格），与影子显示位置对齐
    const placePos = getDisplayPosition(fingerPos, true);
    if (canPlaceAt(placePos.x, placePos.y)) {
      onPiecePlace(placePos);
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
  
  // 检查位置是否在拼图范围内（支持不规则形状，每行长度可能不同）
  const isPositionInPiece = (x: number, y: number, pieceX: number, pieceY: number): boolean => {
    if (!selectedPiece) return false;
    
    const { shape } = selectedPiece;
    const relativeX = x - pieceX;
    const relativeY = y - pieceY;
    
    const row = shape[relativeY];
    return relativeY >= 0 && relativeY < shape.length && 
           relativeX >= 0 && relativeX < (row?.length ?? 0) && 
           row[relativeX] === 1;
  };
  
  // 检查位置是否在悬停预览范围内（点击放置时用）
  const isInHoverPreview = (x: number, y: number): boolean => {
    if (dragMode !== 'none' || !selectedPiece || !hoverPosition) return false;
    return isPositionInPiece(x, y, hoverPosition.x, hoverPosition.y);
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
              <CellWrapper key={`${x}-${y}`} data-cell-x={x} data-cell-y={y}>
                <Cell
                  isOccupied={cell !== 0}
                  playerColor={cell}
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
        {/* 独立预览层：仅渲染拼图形状 ~20 格，避免 400 格重渲染导致移动端卡死 */}
        {selectedPiece && (() => {
          const pos = dragMode === 'dragging' ? mousePosition : hoverPosition;
          if (!pos || pos.x < 0 || pos.y < 0) return null; // 棋盘外开始的拖拽不显示预览
          const isTouch = isTouchActiveRef.current;
          const displayPos = getDisplayPosition(pos, isTouch);
          // 触摸时预览在 displayPos 绘制，判定和放置也应用 displayPos，否则影子与判定位置不一致
          const checkPos = isTouch ? displayPos : pos;
          const valid = canPlaceAt(checkPos.x, checkPos.y);
          const shape = selectedPiece.shape;
          const cells: React.ReactNode[] = [];
          for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < (shape[dy]?.length ?? 0); dx++) {
              if (shape[dy][dx] === 1) {
                const gx = displayPos.x + dx;
                const gy = displayPos.y + dy;
                if (gx >= 0 && gx < 20 && gy >= 0 && gy < 20) {
                  cells.push(
                    <PiecePreviewCell
                      key={`${gx}-${gy}`}
                      $valid={valid}
                      style={{ gridColumn: gx + 1, gridRow: gy + 1 }}
                    />
                  );
                }
              }
            }
          }
          return <PiecePreviewLayer>{cells}</PiecePreviewLayer>;
        })()}
      </BoardGrid>
    </BoardContainer>
  );
};

export default GameBoard;