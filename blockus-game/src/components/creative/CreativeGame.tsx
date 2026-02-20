// 创意模式游戏界面（本地单机 + 多人服务端）

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Game from '../Game';
import styled, { keyframes } from 'styled-components';
import { useCreativeGameState } from '../../hooks/useCreativeGameState';
import GameBoard from '../GameBoard';
import PlayerPieceLibrary from '../PlayerPieceLibrary';
import AIPlayersInfo from '../AIPlayersInfo';
import GameControls from '../GameControls';
import GameOver from '../GameOver';
import GameRulesModal from '../GameRulesModal';
import EffectPopup from './EffectPopup';
import ItemCardBar from './ItemCardBar';
import EventLog from './EventLog';
import { Position, Piece } from '../../types/game';
import { canPlacePiece } from '../../utils/gameEngine';
import { useLanguage } from '../../contexts/LanguageContext';
import soundManager from '../../utils/soundManager';
import { BookIcon, SettingsIcon, RotateIcon, FlipIcon } from '../Icons';

// --- Layout (reuse Game.tsx layout styles) ---

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-gradient);
  overflow: hidden;
  position: relative;
`;

const Header = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--surface-color);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--surface-border);
  z-index: 50;
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const GameContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const LeftPanel = styled.div`
  width: 280px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--surface-highlight);
  border-right: 1px solid var(--surface-border);
  overflow-y: auto;
  z-index: 10;
  transition: all 0.3s ease;

  @media (max-width: 1024px) { width: 220px; }
  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    max-height: 90px;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--surface-border);
    padding: 6px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--surface-color);
    flex-shrink: 0;
  }
`;

const BoardArea = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 20px;
  overflow: hidden;
  @media (max-width: 768px) { padding: 8px; }
`;

const RightPanel = styled.div`
  width: 200px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 10;
  pointer-events: none;
  & > * { pointer-events: auto; }
  @media (max-width: 1024px) { width: 160px; padding: 12px; }
  @media (max-width: 768px) {
    width: 100%;
    flex-direction: row;
    padding: 0 10px;
    height: auto;
    order: -1;
    background: var(--surface-color);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--surface-border);
  }
`;

const BottomDock = styled.div`
  height: 100px;
  width: 100%;
  background: var(--surface-color);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  flex-shrink: 0;
  @media (max-width: 768px) { height: 90px; padding: 0 10px; }
`;

const PieceLibraryWrapper = styled.div`
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const PieceActions = styled.div<{ $visible: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 12px 0 0;
  border-right: 1px solid var(--surface-border);
  margin-right: 12px;
  height: 70%;
  justify-content: center;
  opacity: ${props => props.$visible ? 1 : 0.3};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  transition: opacity 0.2s ease;
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-highlight);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  svg { width: 20px; height: 20px; }
  &:hover { background: var(--surface-border); border-color: var(--text-muted); }
  &:active { transform: scale(0.9); background: var(--surface-border); }
`;

const BackButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  border-radius: 50px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover { background: var(--surface-border); transform: translateX(-2px); }
`;

const ModeBadge = styled.div`
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 50px;
  padding: 4px 14px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const IconButton = styled.button`
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  svg { width: 20px; height: 20px; }
  &:hover { background: var(--surface-border); }
`;

// 道具阶段遮罩
const ItemPhaseOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2500;
  pointer-events: none;
`;

const getPlayerColorIndex = (color: string): number => {
  switch (color) {
    case 'red': return 1;
    case 'yellow': return 2;
    case 'blue': return 3;
    case 'green': return 4;
    default: return 0;
  }
};

const CreativeGame: React.FC = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  // 多人创意房间：交由 Game 组件渲染（复用 MultiplayerGameView）
  if (roomId) {
    return <Game />;
  }

  const {
    gameState, selectPiece, placePieceOnBoard, settlePlayer, resetGame,
    rotateSelectedPiece, flipSelectedPiece, thinkingAI, lastAIMove,
    canPlayerContinue, gameSettings,
    creativeState, showingEffect,
    itemTargetSelection, startUseItemCard, confirmItemTarget, skipItemPhase,
    eventLog, setPaused,
  } = useCreativeGameState();

  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players[0];
  const aiPlayers = gameState.players.slice(1);
  const selectedPieceRef = useRef(gameState.selectedPiece);
  const isHumanTurnRef = useRef(currentPlayer?.color === 'red');
  const myCreative = creativeState.creativePlayers.find(c => c.playerId === 'red');

  const handleBackToLobby = () => {
    soundManager.buttonClick();
    navigate('/', { state: { showTransition: true } });
  };

  const handleSettings = () => {
    soundManager.buttonClick();
    setPaused(true);
    navigate('/settings');
  };

  const handleShowRules = () => {
    soundManager.buttonClick();
    setPaused(true);
    setShowRulesModal(true);
  };

  const handlePieceSelect = (piece: Piece) => {
    if (currentPlayer?.color === 'red' && !piece.isUsed && !creativeState.itemPhase) {
      soundManager.selectPiece();
      selectPiece(piece);
    }
  };

  const handleStartDrag = (piece: Piece, e: React.MouseEvent) => {
    if (currentPlayer?.color === 'red' && !piece.isUsed && !creativeState.itemPhase) {
      soundManager.selectPiece();
      selectPiece(piece);
      const gameBoard = document.querySelector('[data-board-grid]');
      if (gameBoard) {
        gameBoard.dispatchEvent(new CustomEvent('startDragFromLibrary', {
          detail: { piece, clientX: e.clientX, clientY: e.clientY }
        }));
      }
    }
  };

  const handleBoardClick = (position: Position) => {
    if (currentPlayer?.color === 'red' && gameState.selectedPiece && !creativeState.itemPhase) {
      if (canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(currentPlayer.color))) {
        soundManager.placePiece();
      } else {
        soundManager.invalidMove();
      }
      placePieceOnBoard(position);
    }
  };

  const handlePiecePlace = (position: Position) => handleBoardClick(position);
  const handleBoardHover = (position: Position) => setHoveredPosition(position);
  const handleSettle = () => { soundManager.settle(); settlePlayer(); };
  const handleReset = () => { soundManager.buttonClick(); resetGame(); };

  useEffect(() => {
    selectedPieceRef.current = gameState.selectedPiece;
    isHumanTurnRef.current = currentPlayer?.color === 'red';
  }, [gameState.selectedPiece, currentPlayer?.color]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (isHumanTurnRef.current && selectedPieceRef.current) {
        if (e.key === 'ArrowRight') { e.preventDefault(); rotateSelectedPiece(); }
        else if (e.key === 'Shift') { e.preventDefault(); flipSelectedPiece(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateSelectedPiece, flipSelectedPiece]);

  if (!currentPlayer) return null;

  return (
    <>
      {gameState.gamePhase === 'finished' ? (
        <GameOver
          players={gameState.players}
          gameState={gameState}
          onPlayAgain={handleReset}
          onBackToMenu={handleBackToLobby}
        />
      ) : (
        <GameContainer>
          <Header>
            <HeaderLeft>
              <BackButton onClick={handleBackToLobby} onMouseEnter={() => soundManager.buttonHover()}>
                ← {t('common.back')}
              </BackButton>
              <ModeBadge>CREATIVE</ModeBadge>
            </HeaderLeft>
            <HeaderRight>
              <EventLog events={eventLog} />
              <IconButton onClick={handleShowRules} onMouseEnter={() => soundManager.buttonHover()} title={t('help.title')}>
                <BookIcon />
              </IconButton>
              <IconButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
                <SettingsIcon />
              </IconButton>
            </HeaderRight>
          </Header>

          <GameContent>
            <LeftPanel>
              <AIPlayersInfo aiPlayers={aiPlayers} thinkingAI={thinkingAI} />
            </LeftPanel>

            <BoardArea>
              <GameBoard
                gameState={gameState}
                onCellClick={handleBoardClick}
                onCellHover={handleBoardHover}
                onPiecePlace={handlePiecePlace}
                onRotate={rotateSelectedPiece}
                onFlip={flipSelectedPiece}
                lastAIMove={lastAIMove}
                specialTiles={creativeState.specialTiles}
              />
            </BoardArea>

            <RightPanel>
              <GameControls
                gameState={gameState}
                onSettle={handleSettle}
                onReset={handleReset}
                canPlayerContinue={canPlayerContinue}
                myScore={player?.score}
                myColor="red"
              />
            </RightPanel>
          </GameContent>

          <BottomDock>
            <PieceActions $visible={!!gameState.selectedPiece}>
              <ActionBtn onClick={() => { soundManager.rotatePiece(); rotateSelectedPiece(); }}>
                <RotateIcon />
              </ActionBtn>
              <ActionBtn onClick={() => { soundManager.flipPiece(); flipSelectedPiece(); }}>
                <FlipIcon />
              </ActionBtn>
            </PieceActions>
            <PieceLibraryWrapper>
              <PlayerPieceLibrary
                player={player}
                onPieceSelect={handlePieceSelect}
                selectedPiece={gameState.selectedPiece}
                onStartDrag={handleStartDrag}
              />
            </PieceLibraryWrapper>
          </BottomDock>

          {/* 道具阶段遮罩 */}
          {creativeState.itemPhase && <ItemPhaseOverlay />}

          {/* 道具卡栏 */}
          <ItemCardBar
            creativePlayer={myCreative}
            isItemPhase={creativeState.itemPhase}
            itemPhaseTimeLeft={creativeState.itemPhaseTimeLeft}
            players={gameState.players}
            currentPlayerId="red"
            onUseCard={startUseItemCard}
            onSkipPhase={skipItemPhase}
            targetSelection={itemTargetSelection}
            onConfirmTarget={confirmItemTarget}
          />

          {/* 效果弹窗 */}
          {showingEffect && (
            <EffectPopup effect={showingEffect.effect} result={showingEffect.result} />
          )}
        </GameContainer>
      )}
      <GameRulesModal isOpen={showRulesModal} onClose={() => { setShowRulesModal(false); setPaused(false); }} mode="creative" />
    </>
  );
};

export default CreativeGame;
