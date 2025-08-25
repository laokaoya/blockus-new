// 主游戏组件

import React, { useState } from 'react';
import styled from 'styled-components';
import { useGameState } from '../hooks/useGameState';
import GameBoard from './GameBoard';
import PlayerPieceLibrary from './PlayerPieceLibrary';
import AIPlayersInfo from './AIPlayersInfo';
import GameControls from './GameControls';
import { Position, Piece } from '../types/game';
import { canPlacePiece } from '../utils/gameEngine';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const GameHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const GameTitle = styled.h1`
  color: white;
  font-size: 36px;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`;

const GameSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  margin: 10px 0 0 0;
`;

const GameContent = styled.div`
  display: flex;
  gap: 20px;
  flex: 1;
  justify-content: center;
  align-items: flex-start;
  
  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 320px;
`;

const CenterPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 280px;
`;

const Game: React.FC = () => {
  const { gameState, selectPiece, placePieceOnBoard, settlePlayer, resetGame } = useGameState();
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players[0]; // 玩家（红色）
  const aiPlayers = gameState.players.slice(1); // AI玩家
  
  // 处理拼图选择
  const handlePieceSelect = (piece: Piece) => {
    if (currentPlayer.color === 'red' && !piece.isUsed) {
      selectPiece(piece);
    }
  };
  
  // 处理拼图拖拽开始
  const handleStartDrag = (piece: Piece, e: React.MouseEvent) => {
    if (currentPlayer.color === 'red' && !piece.isUsed) {
      selectPiece(piece);
      // 通知GameBoard开始拖拽
      const gameBoard = document.querySelector('[data-board-grid]');
      if (gameBoard) {
        const customEvent = new CustomEvent('startDragFromLibrary', {
          detail: { piece, clientX: e.clientX, clientY: e.clientY }
        });
        gameBoard.dispatchEvent(customEvent);
      }
    }
  };
  
  // 处理拼图取消选择
  const handlePieceCancel = () => {
    // 取消选择当前拼图
    selectPiece(null);
  };
  
  // 处理棋盘点击
  const handleBoardClick = (position: Position) => {
    if (currentPlayer.color === 'red' && gameState.selectedPiece) {
      const success = placePieceOnBoard(position);
      if (success) {
        console.log('拼图放置成功');
      } else {
        console.log('无法在此位置放置拼图');
      }
    }
  };
  
  // 处理拼图放置（拖拽结束）
  const handlePiecePlace = (position: Position) => {
    if (currentPlayer.color === 'red' && gameState.selectedPiece) {
      const success = placePieceOnBoard(position);
      if (success) {
        console.log('拼图放置成功');
      } else {
        console.log('无法在此位置放置拼图');
      }
    }
  };
  
  // 处理棋盘悬停
  const handleBoardHover = (position: Position) => {
    setHoveredPosition(position);
  };
  
  // 处理结算
  const handleSettle = () => {
    settlePlayer();
  };
  
  // 处理重置游戏
  const handleReset = () => {
    resetGame();
  };
  
  // 检查拼图是否可以放置在指定位置
  const canPlaceAt = (x: number, y: number): boolean => {
    if (!gameState.selectedPiece || currentPlayer.color !== 'red') return false;
    
    const colorIndex = 1; // 红色玩家的索引
    return canPlacePiece(gameState.board, gameState.selectedPiece, { x, y }, colorIndex);
  };
  
  return (
    <GameContainer>
      <GameHeader>
        <GameTitle>Blockus 方格大战</GameTitle>
        <GameSubtitle>经典策略拼图游戏</GameSubtitle>
      </GameHeader>
      
      <GameContent>
        {/* 左侧：玩家拼图库 */}
        <LeftPanel>
          <PlayerPieceLibrary
            player={player}
            selectedPiece={gameState.selectedPiece}
            onPieceSelect={handlePieceSelect}
            onStartDrag={handleStartDrag}
          />
        </LeftPanel>
        
        {/* 中央：游戏棋盘和控制 */}
        <CenterPanel>
          <GameBoard
            gameState={gameState}
            onCellClick={handleBoardClick}
            onCellHover={handleBoardHover}
            onPiecePlace={handlePiecePlace}
            onPieceCancel={handlePieceCancel}
          />
          
          <GameControls
            gameState={gameState}
            onSettle={handleSettle}
            onReset={handleReset}
          />
        </CenterPanel>
        
        {/* 右侧：AI玩家信息 */}
        <RightPanel>
          <AIPlayersInfo aiPlayers={aiPlayers} />
        </RightPanel>
      </GameContent>
    </GameContainer>
  );
};

export default Game;
