import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useGameState } from '../hooks/useGameState';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import GameBoard from './GameBoard';
import PlayerPieceLibrary from './PlayerPieceLibrary';
import AIPlayersInfo from './AIPlayersInfo';
import GameControls from './GameControls';
import GameOver from './GameOver';
import { Position, Piece } from '../types/game';
import { canPlacePiece } from '../utils/gameEngine';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import soundManager from '../utils/soundManager';

// --- Responsive Layout Components ---

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: transparent;
  overflow: hidden;
  position: relative;
`;

const Header = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
  background: rgba(15, 23, 42, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 6px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    background: rgba(15, 23, 42, 0.4);
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
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const BottomDock = styled.div`
  height: 100px; /* Reduced from 140px */
  width: 100%;
  background: rgba(5, 10, 20, 0.95); /* Darker background */
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  box-shadow: 0 -5px 30px rgba(0, 0, 0, 0.8);
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


// ScoreDisplay removed
// const ScoreDisplay = styled.div...

// --- UI Components ---

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
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
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-2px);
  }
`;

const SettingsButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
  }
`;

const GameTitle = styled.h1`
  color: var(--text-primary);
  font-size: 1.2rem;
  margin: 0;
  font-weight: 700;
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    display: none; // Hide title on mobile to save space
  }
`;

// SettleButton removed
// const SettleButton = styled.button...

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
    canPlayerContinue, gameSettings
  } = useGameState();
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players[0];
  const aiPlayers = gameState.players.slice(1);

  const handleBackToLobby = () => {
    soundManager.buttonClick();
    navigate('/', { state: { showTransition: true } });
  };

  const handleSettings = () => {
    soundManager.buttonClick();
    navigate('/settings');
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPlayer.color === 'red' && gameState.selectedPiece) {
        if (e.key === 'ArrowRight') { 
          e.preventDefault(); 
          soundManager.rotatePiece();
          rotateSelectedPiece(); 
        }
        else if (e.shiftKey && e.key === 'Shift') { 
          e.preventDefault(); 
          soundManager.flipPiece();
          flipSelectedPiece(); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlayer.color, gameState.selectedPiece, rotateSelectedPiece, flipSelectedPiece]);

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
              <GameTitle>{t('game.title')}</GameTitle>
            </HeaderLeft>
            <HeaderRight>
              <SettingsButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
                ⚙️
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
              />
            </BoardArea>

            <RightPanel>
              <GameControls 
                gameState={gameState} 
                onSettle={handleSettle} 
                onReset={handleReset} 
                canPlayerContinue={canPlayerContinue} 
                myScore={player?.score}
              />
            </RightPanel>
          </GameContent>

          <BottomDock>
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

  const mp = useMultiplayerGame({
    roomId,
    myUserId: user?.profile.id || '',
    myNickname: user?.profile.nickname || '',
  });

  const { 
    gameState, selectPiece, placePieceOnBoard, settlePlayer,
    rotateSelectedPiece, flipSelectedPiece, thinkingAI, lastAIMove,
    canPlayerContinue, isMyTurn, myColor
  } = mp;

  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  
  // 找到自己的 player 对象
  const myPlayer = gameState.players.find(p => p.id === user?.profile.id);
  const otherPlayers = gameState.players.filter(p => p.id !== user?.profile.id);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const handleBackToLobby = async () => {
    soundManager.buttonClick();
    await leaveRoom();
    navigate('/', { state: { showTransition: true } });
  };

  const handleSettings = () => {
    soundManager.buttonClick();
    navigate('/settings');
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
  
  const handleBoardClick = (position: Position) => {
    if (!isSpectateMode && isMyTurn && gameState.selectedPiece) {
      if (canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(myColor))) {
        soundManager.placePiece();
      } else {
        soundManager.invalidMove();
      }
      placePieceOnBoard(position);
    }
  };
  
  const handlePiecePlace = (position: Position) => {
    if (!isSpectateMode && isMyTurn && gameState.selectedPiece) {
      if (canPlacePiece(gameState.board, gameState.selectedPiece, position, getPlayerColorIndex(myColor))) {
        soundManager.placePiece();
      } else {
        soundManager.invalidMove();
      }
      placePieceOnBoard(position);
    }
  };
  
  const handleBoardHover = (position: Position) => setHoveredPosition(position);
  const handleSettle = () => { 
    if (!isSpectateMode) {
      soundManager.settle();
      settlePlayer(); 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSpectateMode && isMyTurn && gameState.selectedPiece) {
        if (e.key === 'ArrowRight') { 
          e.preventDefault(); 
          soundManager.rotatePiece();
          rotateSelectedPiece(); 
        }
        else if (e.shiftKey && e.key === 'Shift') { 
          e.preventDefault(); 
          soundManager.flipPiece();
          flipSelectedPiece(); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpectateMode, isMyTurn, gameState.selectedPiece, rotateSelectedPiece, flipSelectedPiece]);

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
              <GameTitle>{t('game.title')}</GameTitle>
            </HeaderLeft>
            <HeaderRight>
              <SettingsButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
                ⚙️
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
                />
              )}
            </RightPanel>
          </GameContent>

          <BottomDock>
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

          {isSpectateMode && (
            <SpectatorBadge>👁 观战模式</SpectatorBadge>
          )}
        </GameContainer>
      )}
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
