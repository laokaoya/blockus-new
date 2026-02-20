import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useGameState } from '../hooks/useGameState';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import GameBoard from './GameBoard';
import PlayerPieceLibrary from './PlayerPieceLibrary';
import AIPlayersInfo from './AIPlayersInfo';
import GameControls from './GameControls';
import GameOver from './GameOver';
import GameRulesModal from './GameRulesModal';
import ChatBox from './ChatBox';
import { Position, Piece } from '../types/game';
import type { SpecialTile } from '../types/creative';
import { canPlacePiece } from '../utils/gameEngine';
import { overlapsBarrier } from '../utils/creativeModeEngine';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import soundManager from '../utils/soundManager';
import socketService from '../services/socketService';
import { BookIcon, SettingsIcon, RotateIcon, FlipIcon, EyeIcon } from './Icons';
import ItemCardBar from './creative/ItemCardBar';
import type { ItemCard, CreativePlayerState } from '../types/creative';

// --- Responsive Layout Components ---

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

  @media (max-width: 1024px) {
    width: 220px;
  }

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

  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const RightPanel = styled.div`
  width: 200px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  z-index: 10;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }

  @media (max-width: 1024px) {
    width: 160px;
    padding: 12px;
  }

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
  height: 100px; /* Reduced from 140px */
  width: 100%;
  background: var(--surface-color); /* Darker background */
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  flex-shrink: 0;

  @media (max-width: 768px) {
    height: 90px;
    padding: 0 10px;
  }
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

  @media (max-width: 768px) {
    padding: 0 8px 0 0;
    margin-right: 8px;
    gap: 4px;
  }
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

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--surface-border);
    border-color: var(--text-muted);
  }

  &:active {
    transform: scale(0.9);
    background: var(--surface-border);
  }

  @media (max-width: 768px) {
    width: 38px;
    height: 38px;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

// --- UI Components ---

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
  
  &:hover {
    background: var(--surface-border);
    transform: translateX(-2px);
  }
`;

const SettingsButton = styled.button`
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
  
  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--surface-border);
    transform: rotate(90deg);
  }
`;

const RulesButton = styled.button`
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
  
  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: var(--surface-border);
    transform: translateY(-1px);
  }
`;


// SettleButton removed
// const SettleButton = styled.button...

const PausedOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  padding: 20px;
`;

const PauseOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 200;
  color: var(--text-primary);
  padding: 24px;
  text-align: center;
`;

const PauseTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--primary-color);
`;

const PauseDesc = styled.div`
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 320px;
`;

const SpectatorBadge = styled.div`
  position: fixed;
  top: 70px;
  right: 20px;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 6px 16px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  z-index: 1000;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: 6px;
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

// ============= 单人游戏组件 =============
const SinglePlayerGame: React.FC = () => {
  const { 
    gameState, selectPiece, placePieceOnBoard, settlePlayer, resetGame,
    rotateSelectedPiece, flipSelectedPiece, thinkingAI, lastAIMove,
    canPlayerContinue, gameSettings, setPaused,
  } = useGameState();
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players[0];
  const aiPlayers = gameState.players.slice(1);
  const selectedPieceRef = useRef(gameState.selectedPiece);
  const isHumanTurnRef = useRef(currentPlayer.color === 'red');

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
    if (currentPlayer.color === 'red' && !piece.isUsed) {
      soundManager.selectPiece();
      selectPiece(piece);
    }
  };
  
  const handleStartDrag = (piece: Piece, e: React.MouseEvent) => {
    if (currentPlayer.color === 'red' && !piece.isUsed) {
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
  
  const handlePieceCancel = () => selectPiece(null);
  
  const handleBoardClick = (position: Position) => {
    if (currentPlayer.color === 'red' && gameState.selectedPiece) {
      if (canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(currentPlayer.color))) {
        soundManager.placePiece();
      } else {
        soundManager.invalidMove();
      }
      placePieceOnBoard(position);
    }
  };
  
  const handlePiecePlace = (position: Position) => {
    if (currentPlayer.color === 'red' && gameState.selectedPiece) {
      if (canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(currentPlayer.color))) {
        soundManager.placePiece();
      } else {
        soundManager.invalidMove();
      }
      placePieceOnBoard(position);
    }
  };
  
  const handleBoardHover = (position: Position) => setHoveredPosition(position);
  const handleSettle = () => {
    soundManager.settle();
    settlePlayer();
  };
  const handleReset = () => {
    soundManager.buttonClick();
    resetGame();
  };

  useEffect(() => {
    selectedPieceRef.current = gameState.selectedPiece;
    isHumanTurnRef.current = currentPlayer.color === 'red';
  }, [gameState.selectedPiece, currentPlayer.color]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (isHumanTurnRef.current && selectedPieceRef.current) {
        if (e.key === 'ArrowRight') { 
          e.preventDefault(); 
          rotateSelectedPiece(); 
        }
        else if (e.key === 'Shift') { 
          e.preventDefault(); 
          flipSelectedPiece(); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateSelectedPiece, flipSelectedPiece]);

  return (
    <>
      {gameState.gamePhase === 'finished' ? (
        <GameOver players={gameState.players} gameState={gameState} onPlayAgain={handleReset} onBackToMenu={() => { handleReset(); }} />
      ) : (
        <GameContainer>
          <Header>
            <HeaderLeft>
              <BackButton onClick={handleBackToLobby} onMouseEnter={() => soundManager.buttonHover()}>
                ← {t('common.back')}
              </BackButton>
            </HeaderLeft>
            <HeaderRight>
              <RulesButton onClick={handleShowRules} onMouseEnter={() => soundManager.buttonHover()} title={t('help.title')}>
                <BookIcon />
              </RulesButton>
              <SettingsButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
                <SettingsIcon />
              </SettingsButton>
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
                specialTiles={gameState.creativeState?.specialTiles as SpecialTile[] | undefined}
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
              <ActionBtn
                onClick={() => { soundManager.rotatePiece(); rotateSelectedPiece(); }}
                aria-label={t('game.rotate') || 'Rotate piece'}
              ><RotateIcon /></ActionBtn>
              <ActionBtn
                onClick={() => { soundManager.flipPiece(); flipSelectedPiece(); }}
                aria-label={t('game.flip') || 'Flip piece'}
              ><FlipIcon /></ActionBtn>
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
        </GameContainer>
      )}
      <GameRulesModal isOpen={showRulesModal} onClose={() => { setShowRulesModal(false); setPaused(false); }} />
    </>
  );
};

// ============= 多人游戏组件 =============
const MultiplayerGameView: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isSpectating, leaveRoom } = useRoom();
  const [searchParams] = useSearchParams();
  const isSpectateMode = searchParams.get('spectate') === 'true' || isSpectating;
  const [showRulesModal, setShowRulesModal] = useState(false);

  const mp = useMultiplayerGame({
    roomId,
    myUserId: user?.profile.id || '',
    myNickname: user?.profile.nickname || '',
    isSpectating: isSpectateMode,
  });

  const { 
    gameState, selectPiece, placePieceOnBoard, settlePlayer, useItemCard,
    rotateSelectedPiece, flipSelectedPiece, thinkingAI, lastAIMove,
    canPlayerContinue, isMyTurn, isPaused, myColor
  } = mp;

  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [itemTargetSelection, setItemTargetSelection] = useState<{ cardIndex: number; card: ItemCard } | null>(null);

  const myCreative = gameState.creativeState?.creativePlayers.find(c => c.playerId === user?.profile.id);
  
  // 找到自己的 player 对象
  const myPlayer = gameState.players.find(p => p.id === user?.profile.id);
  const otherPlayers = gameState.players.filter(p => p.id !== user?.profile.id);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const selectedPieceRef = useRef(gameState.selectedPiece);
  const isMyTurnRef = useRef(isMyTurn);
  const isSpectateRef = useRef(isSpectateMode);

  const handleBackToLobby = async () => {
    soundManager.buttonClick();
    await leaveRoom();
    navigate('/', { state: { showTransition: true } });
  };

  // 被房主踢出时，立即返回主界面（房间页和游戏中都需处理）
  useEffect(() => {
    const unsub = socketService.on('room:playerLeft', (data: { roomId: string; playerId: string }) => {
      if (data.roomId === roomId && data.playerId === user?.profile.id) {
        leaveRoom();
        navigate('/', { state: { showTransition: true } });
      }
    });
    return unsub;
  }, [roomId, user?.profile.id, leaveRoom, navigate]);

  const handleSettings = () => {
    soundManager.buttonClick();
    navigate('/settings');
  };

  const handleShowRules = () => {
    soundManager.buttonClick();
    setShowRulesModal(true);
  };
  
  const handlePieceSelect = (piece: Piece) => {
    if (!isSpectateMode && isMyTurn && !piece.isUsed) {
      soundManager.selectPiece();
      selectPiece(piece);
    }
  };
  
  const handleStartDrag = (piece: Piece, e: React.MouseEvent) => {
    if (!isSpectateMode && isMyTurn && !piece.isUsed) {
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
  
  const handlePieceCancel = () => { if (!isSpectateMode) selectPiece(null); };
  
  const canPlaceAt = (position: Position) => {
    if (!gameState.selectedPiece) return false;
    const ok = canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(myColor));
    if (!ok) return false;
    const specialTiles = gameState.creativeState?.specialTiles;
    if (specialTiles?.length && overlapsBarrier(gameState.selectedPiece.shape, position, specialTiles)) return false;
    return true;
  };

  const handleBoardClick = (position: Position) => {
    if (!isSpectateMode && isMyTurn && gameState.selectedPiece) {
      if (canPlaceAt(position)) {
        soundManager.placePiece();
        placePieceOnBoard(position);
      } else {
        soundManager.invalidMove();
      }
    }
  };
  
  const handlePiecePlace = (position: Position) => {
    if (!isSpectateMode && isMyTurn && gameState.selectedPiece) {
      if (canPlaceAt(position)) {
        soundManager.placePiece();
        placePieceOnBoard(position);
      } else {
        soundManager.invalidMove();
      }
    }
  };
  
  const handleBoardHover = (position: Position) => setHoveredPosition(position);
  const handleSettle = () => { 
    if (!isSpectateMode) {
      soundManager.settle();
      settlePlayer(); 
    }
  };

  const handleUseItemCard = (cardIndex: number) => {
    if (isSpectateMode || !isMyTurn || !myCreative) return;
    const card = myCreative.itemCards[cardIndex];
    if (!card) return;
    if (card.needsTarget) {
      setItemTargetSelection({ cardIndex, card });
    } else {
      useItemCard(cardIndex);
    }
  };

  const handleConfirmItemTarget = async (targetPlayerId: string) => {
    if (!itemTargetSelection) return;
    const result = await useItemCard(itemTargetSelection.cardIndex, targetPlayerId);
    if (result.success) setItemTargetSelection(null);
  };

  useEffect(() => {
    selectedPieceRef.current = gameState.selectedPiece;
    isMyTurnRef.current = isMyTurn;
    isSpectateRef.current = isSpectateMode;
  }, [gameState.selectedPiece, isMyTurn, isSpectateMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!isSpectateRef.current && isMyTurnRef.current && selectedPieceRef.current) {
        if (e.key === 'ArrowRight') { 
          e.preventDefault(); 
          rotateSelectedPiece(); 
        }
        else if (e.key === 'Shift') { 
          e.preventDefault(); 
          flipSelectedPiece(); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateSelectedPiece, flipSelectedPiece]);

  // Add loading check
  if (!gameState.players || gameState.players.length === 0) {
    return (
      <GameContainer>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          color: 'var(--text-primary)',
          fontSize: '1.2rem',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          {t('common.loading') || 'Loading game data...'}
        </div>
      </GameContainer>
    );
  }

  return (
    <>
      {gameState.gamePhase === 'finished' ? (
        <GameOver 
          players={gameState.players} 
          gameState={gameState} 
          onPlayAgain={handleBackToLobby}
          onBackToMenu={handleBackToLobby}
        />
      ) : (
        <GameContainer>
          <Header>
            <HeaderLeft>
              <BackButton onClick={handleBackToLobby} onMouseEnter={() => soundManager.buttonHover()}>
                ← {t('common.back')}
              </BackButton>
            </HeaderLeft>
            <HeaderRight>
              <RulesButton onClick={handleShowRules} onMouseEnter={() => soundManager.buttonHover()} title={t('help.title')}>
                <BookIcon />
              </RulesButton>
              <SettingsButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
                <SettingsIcon />
              </SettingsButton>
            </HeaderRight>
          </Header>

          <GameContent>
            <LeftPanel>
              <AIPlayersInfo aiPlayers={otherPlayers} thinkingAI={thinkingAI} />
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
                specialTiles={gameState.creativeState?.specialTiles as SpecialTile[] | undefined}
              />
            </BoardArea>
            
            <RightPanel>
              {!isSpectateMode && (
                <GameControls 
                  gameState={gameState} 
                  onSettle={handleSettle} 
                  onReset={handleBackToLobby} 
                  canPlayerContinue={canPlayerContinue}
                  myScore={myPlayer?.score}
                  myColor={myPlayer?.color}
                />
              )}
            </RightPanel>
          </GameContent>

          <BottomDock>
            <PieceActions $visible={!!gameState.selectedPiece && !isSpectateMode}>
              <ActionBtn
                onClick={() => { soundManager.rotatePiece(); rotateSelectedPiece(); }}
                aria-label={t('game.rotate') || 'Rotate piece'}
              ><RotateIcon /></ActionBtn>
              <ActionBtn
                onClick={() => { soundManager.flipPiece(); flipSelectedPiece(); }}
                aria-label={t('game.flip') || 'Flip piece'}
              ><FlipIcon /></ActionBtn>
            </PieceActions>
            <PieceLibraryWrapper>
              {myPlayer && (
                <PlayerPieceLibrary 
                  player={myPlayer}
                  onPieceSelect={handlePieceSelect}
                  selectedPiece={gameState.selectedPiece}
                  onStartDrag={handleStartDrag}
                />
              )}
            </PieceLibraryWrapper>
          </BottomDock>

          {/* 创意模式道具卡栏 */}
          {gameState.creativeState && myCreative && (
            <ItemCardBar
              creativePlayer={myCreative as CreativePlayerState}
              isItemPhase={isMyTurn && !isSpectateMode && myCreative.itemCards.length > 0 && !itemTargetSelection}
              itemPhaseTimeLeft={0}
              players={gameState.players}
              currentPlayerId={myPlayer?.id ?? ''}
              onUseCard={handleUseItemCard}
              onSkipPhase={() => setItemTargetSelection(null)}
              targetSelection={itemTargetSelection}
              onConfirmTarget={handleConfirmItemTarget}
            />
          )}

          {isSpectateMode && (
            <SpectatorBadge><EyeIcon /> {t('room.spectate') || '观战模式'}</SpectatorBadge>
          )}
          {isPaused && (
            <PauseOverlay>
              <PauseTitle>{t('game.paused') || '游戏已暂停'}</PauseTitle>
              <PauseDesc>{t('game.pausedReconnect') || '玩家已离开，请返回大厅后点击「回到游戏」继续'}</PauseDesc>
            </PauseOverlay>
          )}
          <ChatBox />
        </GameContainer>
      )}
      <GameRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </>
  );
};

// ============= 主 Game 组件：路由分发 =============
const Game: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentRoom, isSpectating } = useRoom();

  // 通过 URL 参数或房间上下文判断是否为多人模式
  const multiplayerRoomId = searchParams.get('roomId') || (currentRoom?.status === 'playing' ? currentRoom.id : null);
  const isSpectateMode = searchParams.get('spectate') === 'true' || isSpectating;

  if (multiplayerRoomId) {
    return <MultiplayerGameView roomId={multiplayerRoomId} />;
  }

  return <SinglePlayerGame />;
};

export default Game;
