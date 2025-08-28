// 主游戏组件

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGameState } from '../hooks/useGameState';
import GameBoard from './GameBoard';
import PlayerPieceLibrary from './PlayerPieceLibrary';
import AIPlayersInfo from './AIPlayersInfo';
import GameControls from './GameControls';
import GameOver from './GameOver';
import { Position, Piece } from '../types/game';
import { canPlacePiece } from '../utils/gameEngine';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const GameHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
`;

const BackButton = styled.button`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-50%) translateX(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
`;

const GameTitle = styled.h1`
  color: white;
  font-size: 36px;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
  
  @media (max-width: 480px) {
    font-size: 20px;
  }
`;

const GameSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  margin: 10px 0 0 0;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin: 8px 0 0 0;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
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
    gap: 15px;
  }
  
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 320px;
  
  @media (max-width: 1200px) {
    min-width: auto;
    width: 100%;
    max-width: 400px;
  }
  
  @media (max-width: 768px) {
    gap: 15px;
    max-width: 100%;
  }
`;

const CenterPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 280px;
  position: relative;
  
  @media (max-width: 1200px) {
    min-width: auto;
    width: 100%;
    max-width: 400px;
  }
  
  @media (max-width: 768px) {
    gap: 15px;
    max-width: 100%;
  }
`;

const SettleButton = styled.button<{ isUrgent: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  
  background: ${props => props.isUrgent 
    ? 'linear-gradient(135deg, #f44336, #d32f2f)' 
    : 'linear-gradient(135deg, #2196F3, #1976D2)'
  };
  color: white;
  
  ${props => props.isUrgent && `
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
    animation: pulse 2s ease-in-out infinite;
  `}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1.05); }
    50% { transform: scale(1.1); }
  }
  
  @media (max-width: 768px) {
    bottom: 15px;
    right: 15px;
    padding: 10px 20px;
    font-size: 14px;
  }
`;

const Game: React.FC = () => {
  const { 
    gameState, 
    selectPiece, 
    placePieceOnBoard, 
    settlePlayer, 
    resetGame,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    canPlayerContinue,
    gameSettings
  } = useGameState();
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players[0]; // 玩家（红色）
  const aiPlayers = gameState.players.slice(1); // AI玩家

  // 处理返回大厅
  const handleBackToLobby = () => {
    navigate('/');
  };
  
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

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有人类玩家回合且有选中拼图时才响应键盘
      if (currentPlayer.color === 'red' && gameState.selectedPiece) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          rotateSelectedPiece();
        } else if (e.shiftKey && e.key === 'Shift') {
          e.preventDefault();
          flipSelectedPiece();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlayer.color, gameState.selectedPiece, rotateSelectedPiece, flipSelectedPiece]);
  
  // 检查拼图是否可以放置在指定位置
  const canPlaceAt = (x: number, y: number): boolean => {
    if (!gameState.selectedPiece || currentPlayer.color !== 'red') return false;
    
    const colorIndex = 1; // 红色玩家的索引
    return canPlacePiece(gameState.board, gameState.selectedPiece, { x, y }, colorIndex);
  };
  
  return (
    <>
      {/* 游戏结束界面 */}
      {gameState.gamePhase === 'finished' ? (
        <GameOver
          players={gameState.players}
          gameState={gameState}
          onPlayAgain={handleReset}
          onBackToMenu={() => {
            // 这里可以添加返回菜单的逻辑
            handleReset();
          }}
        />
      ) : (
        /* 主游戏界面 */
        <GameContainer>
        <GameHeader>
          <BackButton onClick={handleBackToLobby}>← {t('common.back')}</BackButton>
          <GameTitle>{t('game.title')}</GameTitle>
          <GameSubtitle>{t('game.description')}</GameSubtitle>
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
              canPlayerContinue={canPlayerContinue}
            />
          </CenterPanel>
          
          {/* 右侧：AI玩家信息 */}
          <RightPanel>
            <AIPlayersInfo 
              aiPlayers={aiPlayers}
              thinkingAI={thinkingAI}
              aiDifficulty={gameSettings.aiDifficulty}
            />
          </RightPanel>
        </GameContent>
        
        {/* 右下角结算按钮 - 始终可见 */}
        {gameState.gamePhase === 'playing' && !player.isSettled && (
          <SettleButton 
            onClick={handleSettle}
            isUrgent={!canPlayerContinue(player)}
          >
            {!canPlayerContinue(player) ? `🚨 ${t('game.urgentSettle')}` : `💡 ${t('game.settle')}`}
          </SettleButton>
        )}
      </GameContainer>
      )}
    </>
  );
};

export default Game;
