// 游戏状态管理Hook

import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Player, Piece, Position, PlayerColor } from '../types/game';
import { PIECE_SHAPES, PIECE_COUNTS, PLAYER_COLORS, PLAYER_NAMES } from '../constants/pieces';
import { canPlacePiece, placePiece, calculateScore, isGameFinished, getWinner } from '../utils/gameEngine';
import { AIPlayer } from '../utils/aiPlayer';
import { rotatePiece, flipPiece, getUniqueTransformations } from '../utils/pieceTransformations';
import soundManager from '../utils/soundManager';

const BOARD_SIZE = 20;
const DEFAULT_TURN_TIME_LIMIT = 60; // 默认时间限制改为60秒

// 游戏设置接口
interface GameSettings {
  aiDifficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  showHints: boolean;
}

// 获取本地化玩家名称
function getLocalizedPlayerName(color: PlayerColor, language: string = 'zh'): string {
  if (language === 'en') {
    switch (color) {
      case 'red': return 'Player';
      case 'yellow': return 'AI-Yellow';
      case 'blue': return 'AI-Blue';
      case 'green': return 'AI-Green';
      default: return 'Player';
    }
  } else {
    switch (color) {
      case 'red': return '玩家';
      case 'yellow': return 'AI-小黄';
      case 'blue': return 'AI-小蓝';
      case 'green': return 'AI-小绿';
      default: return '玩家';
    }
  }
}

export function useGameState() {
  // 从localStorage读取游戏设置
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('gameSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch { /* ignore corrupt data */ }
    return {
      aiDifficulty: 'medium',
      timeLimit: 60,
      showHints: true
    };
  });

  // 获取当前语言设置
  const getCurrentLanguage = (): string => {
    return localStorage.getItem('language') || 'zh';
  };

  // 初始化游戏状态
  const [gameState, setGameState] = useState<GameState>(() => initializeGameState());
  const [aiPlayers, setAiPlayers] = useState<AIPlayer[]>([]);
  const [thinkingAI, setThinkingAI] = useState<string | null>(null);
  const [lastAIMove, setLastAIMove] = useState<Array<{ x: number; y: number }>>([]);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutCountRef = useRef<Record<string, number>>({});
  
  // 初始化AI玩家
  useEffect(() => {
    const ais = [
      new AIPlayer('yellow', gameSettings.aiDifficulty),
      new AIPlayer('blue', gameSettings.aiDifficulty),
      new AIPlayer('green', gameSettings.aiDifficulty)
    ];
    setAiPlayers(ais);
  }, [gameSettings.aiDifficulty]);
  
  // 初始化游戏状态
  function initializeGameState(): GameState {
    const currentLanguage = getCurrentLanguage();
    const players: Player[] = [
      createPlayer('red', getLocalizedPlayerName('red', currentLanguage)),
      createPlayer('yellow', getLocalizedPlayerName('yellow', currentLanguage)),
      createPlayer('blue', getLocalizedPlayerName('blue', currentLanguage)),
      createPlayer('green', getLocalizedPlayerName('green', currentLanguage))
    ];
    
    // 随机选择先手玩家
    const randomFirstPlayerIndex = Math.floor(Math.random() * players.length);
    players[randomFirstPlayerIndex].isCurrentTurn = true;
    
    // 使用设置中的时间限制
    const timeLimit = gameSettings.timeLimit || DEFAULT_TURN_TIME_LIMIT;
    
    return {
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)),
      players,
      currentPlayerIndex: randomFirstPlayerIndex,
      gamePhase: 'playing',
      turnTimeLimit: timeLimit,
      timeLeft: randomFirstPlayerIndex === 0 ? timeLimit : 0, // 只有人类玩家有时间限制
      selectedPiece: null,
      selectedPiecePosition: null,
      turnCount: 1, // 游戏开始，第一回合
      moves: [] // 初始化空的移动记录
    };
  }
  
  // 创建玩家
  function createPlayer(color: PlayerColor, name: string): Player {
    const pieces: Piece[] = [];
    let pieceId = 0;
    
    // 为每种类型的拼图创建所有形状的实例
    Object.entries(PIECE_SHAPES).forEach(([type, shapes]) => {
      const pieceType = parseInt(type) as 1 | 2 | 3 | 4 | 5;
      
      // 为每个形状创建一个拼图块
      shapes.forEach((shape, shapeIndex) => {
        pieces.push({
          id: `${color}-${pieceType}-${shapeIndex}-${pieceId++}`,
          type: pieceType,
          shape: shape,
          color,
          isUsed: false
        });
      });
    });
    
    return {
      id: color,
      name,
      color,
      pieces,
      score: 0,
      isSettled: false,
      isCurrentTurn: false,
      isAI: color !== 'red' // 假设红色是玩家，其他是AI
    };
  }
  
  // 选择拼图
  const selectPiece = useCallback((piece: Piece | null) => {
    if (piece) soundManager.selectPiece();
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece
    }));
  }, []);

  // 旋转拼图
  const rotateSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.rotatePiece();
      return {
        ...prev,
        selectedPiece: rotatePiece(prev.selectedPiece)
      };
    });
  }, []);

  // 翻转拼图
  const flipSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      soundManager.flipPiece();
      return {
        ...prev,
        selectedPiece: flipPiece(prev.selectedPiece)
      };
    });
  }, []);
  
  // 检查玩家是否可以继续放置拼图
  const canPlayerContinue = useCallback((player: Player) => {
    if (player.isSettled) return false;
    
    const availablePieces = player.pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return false;
    
    const colorIndex = gameState.players.findIndex(p => p.id === player.id) + 1;
    const boardSize = gameState.board.length;
    
    for (const piece of availablePieces) {
      const variants = getUniqueTransformations(piece);
      for (const variant of variants) {
        for (let y = 0; y < boardSize; y++) {
          for (let x = 0; x < boardSize; x++) {
            if (canPlacePiece(gameState.board, variant, { x, y }, colorIndex)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, [gameState.board, gameState.players]);

  // 查找下一个活跃玩家（未结算的）
  const findNextActivePlayer = useCallback((currentIndex: number, players: Player[]): number => {
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    
    // 最多尝试players.length次，避免无限循环
    while (players[nextIndex].isSettled && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    
    return nextIndex;
  }, []);

  // 放置拼图
  const placePieceOnBoard = useCallback((position: Position) => {
    if (!gameState.selectedPiece) return false;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const colorIndex = gameState.currentPlayerIndex + 1;
    
    // 检查是否是当前玩家的回合
    if (!currentPlayer.isCurrentTurn) return false;
    
    if (!canPlacePiece(gameState.board, gameState.selectedPiece, position, colorIndex)) {
      soundManager.invalidMove();
      return false;
    }
    
    soundManager.placePiece();
    
    // 放置拼图
    const newBoard = placePiece(gameState.board, gameState.selectedPiece, position, colorIndex);
    
    // 计算棋盘变化
    const boardChanges: Array<{ x: number; y: number; color: number }> = [];
    const { shape } = gameState.selectedPiece;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] === 1) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          if (boardX >= 0 && boardX < 20 && boardY >= 0 && boardY < 20) {
            boardChanges.push({ x: boardX, y: boardY, color: colorIndex });
          }
        }
      }
    }
    
    // 标记拼图为已使用
    const newPlayers = gameState.players.map(player => {
      if (player.id === currentPlayer.id) {
        const newPieces = player.pieces.map(p => 
          p.id === gameState.selectedPiece!.id ? { ...p, isUsed: true } : p
        );
        return { ...player, pieces: newPieces };
      }
      return player;
    });
    
    // 计算新得分
    const newScore = calculateScore(newBoard, colorIndex);
    const updatedPlayers = newPlayers.map(player => 
      player.id === currentPlayer.id ? { ...player, score: newScore } : player
    );
    
    // 进入下一回合
    const nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, updatedPlayers);
    const nextPlayers = updatedPlayers.map((player, index) => ({
      ...player,
      isCurrentTurn: index === nextPlayerIndex
    }));
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      players: nextPlayers,
      currentPlayerIndex: nextPlayerIndex,
      selectedPiece: null,
      selectedPiecePosition: null,
      timeLeft: gameSettings.timeLimit,
      turnCount: prev.turnCount + 1, // 增加回合计数
      moves: [...prev.moves, {
        playerColor: currentPlayer.color,
        boardChanges: boardChanges,
        timestamp: Date.now()
      }]
    }));
    
    return true;
  }, [gameState, findNextActivePlayer, gameSettings.timeLimit]);
  
    // AI回合
  const processAITurn = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 跳过玩家回合和已结算的AI
    if (currentPlayer.color === 'red' || currentPlayer.isSettled) return;
    
    // 设置AI思考状态
    setThinkingAI(currentPlayer.color);
    soundManager.aiTurn();
    
    // AI思考时间根据回合数调整：前8回合2-3秒，之后3-5秒
    let thinkingTime;
    if (gameState.turnCount <= 8) {
      thinkingTime = Math.random() * 1000 + 2000; // 2000-3000ms
    } else {
      thinkingTime = Math.random() * 2000 + 3000; // 3000-5000ms
    }
    
    aiTimeoutRef.current = setTimeout(() => {
      const aiPlayer = aiPlayers.find(ai => ai.getColor() === currentPlayer.color);
      if (!aiPlayer) {
        // 兜底：AI实例异常时，避免回合悬空导致卡死
        setThinkingAI(null);
        setGameState(prev => {
          const curr = prev.players[prev.currentPlayerIndex];
          if (!curr || curr.color === 'red') return prev;

          const settledPlayers = prev.players.map(player =>
            player.id === curr.id ? { ...player, isSettled: true } : player
          );
          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, settledPlayers);
          const nextPlayers = settledPlayers.map((player, index) => ({
            ...player,
            isCurrentTurn: index === nextPlayerIndex
          }));
          const allSettled = nextPlayers.every(player => player.isSettled);

          return {
            ...prev,
            players: nextPlayers,
            currentPlayerIndex: nextPlayerIndex,
            timeLeft: gameSettings.timeLimit,
            turnCount: prev.turnCount + 1,
            gamePhase: allSettled ? 'finished' : prev.gamePhase
          };
        });
        return;
      }
      
      const move = aiPlayer.makeMove(gameState.board, currentPlayer.pieces);
      
      if (move) {
        const colorIndex = gameState.currentPlayerIndex + 1;
        const newBoard = placePiece(gameState.board, move.piece, move.position, colorIndex);
        
        const newPlayers = gameState.players.map(player => {
          if (player.id === currentPlayer.id) {
            const newPieces = player.pieces.map(p => 
              p.id === move.piece.id ? { ...p, isUsed: true } : p
            );
            const newScore = calculateScore(newBoard, colorIndex);
            return { ...player, pieces: newPieces, score: newScore };
          }
          return player;
        });
        
        const nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
        const nextPlayers = newPlayers.map((player, index) => ({
          ...player,
          isCurrentTurn: index === nextPlayerIndex
        }));
        
        const boardChanges: Array<{ x: number; y: number; color: number }> = [];
        const { shape } = move.piece;
        
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] === 1) {
              const boardX = move.position.x + x;
              const boardY = move.position.y + y;
              if (boardX >= 0 && boardX < 20 && boardY >= 0 && boardY < 20) {
                boardChanges.push({ x: boardX, y: boardY, color: colorIndex });
              }
            }
          }
        }
        
        soundManager.aiPlace();
        setLastAIMove(boardChanges.map(c => ({ x: c.x, y: c.y })));
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setLastAIMove([]), 1200);
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          players: nextPlayers,
          currentPlayerIndex: nextPlayerIndex,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1,
          moves: [...prev.moves, {
            playerColor: currentPlayer.color,
            boardChanges: boardChanges,
            timestamp: Date.now()
          }]
        }));
      } else {
        const newPlayers = gameState.players.map(player => 
          player.id === currentPlayer.id ? { ...player, isSettled: true } : player
        );
        
        const nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
        const nextPlayers = newPlayers.map((player, index) => ({
          ...player,
          isCurrentTurn: index === nextPlayerIndex
        }));
        
        setGameState(prev => ({
          ...prev,
          players: nextPlayers,
          currentPlayerIndex: nextPlayerIndex,
          timeLeft: gameSettings.timeLimit,
          turnCount: prev.turnCount + 1
        }));
      }
      
      setThinkingAI(null);
    }, thinkingTime);
  }, [gameState, aiPlayers, findNextActivePlayer, gameSettings.timeLimit]);
  
  // 结算玩家
  const settlePlayer = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.color !== 'red') return;
    soundManager.settle();
    
    const newPlayers = gameState.players.map(player => 
      player.id === currentPlayer.id ? { ...player, isSettled: true } : player
    );
    
    // 进入下一回合
    const nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
    const nextPlayers = newPlayers.map((player, index) => ({
      ...player,
      isCurrentTurn: index === nextPlayerIndex
    }));
    
    setGameState(prev => ({
      ...prev,
      players: nextPlayers,
      currentPlayerIndex: nextPlayerIndex,
      timeLeft: gameSettings.timeLimit,
      turnCount: prev.turnCount + 1 // 增加回合计数
    }));
  }, [gameState, findNextActivePlayer, gameSettings.timeLimit]);
  
  // 重置游戏
  const resetGame = useCallback(() => {
    setGameState(initializeGameState());
    setThinkingAI(null); // 清除AI思考状态
    timeoutCountRef.current = {};
  }, [gameSettings]);

  // 当游戏设置改变时，重新初始化游戏状态
  useEffect(() => {
    setGameState(initializeGameState());
    timeoutCountRef.current = {};
  }, [gameSettings]);
  
  // 倒计时 - 只有人类玩家有时间限制
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 只有人类玩家（红色）有时间限制
    if (currentPlayer.color !== 'red') return;
    if (currentPlayer.isSettled) return;
    
    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      setGameState(prev => {
        const currPlayer = prev.players[prev.currentPlayerIndex];
        if (!currPlayer || currPlayer.color !== 'red' || currPlayer.isSettled) return prev;

        if (prev.timeLeft <= 1) {
          const timeoutPlayerId = currPlayer.id;
          const nextTimeoutCount = (timeoutCountRef.current[timeoutPlayerId] || 0) + 1;
          timeoutCountRef.current[timeoutPlayerId] = nextTimeoutCount;

          // 同一玩家累计超时 3 次，直接进入结算状态
          if (nextTimeoutCount >= 3) {
            const settledPlayers = prev.players.map((player, index) => ({
              ...player,
              isSettled: index === prev.currentPlayerIndex ? true : player.isSettled
            }));
            const nextPlayerIndexAfterSettle = findNextActivePlayer(prev.currentPlayerIndex, settledPlayers);
            const nextPlayersAfterSettle = settledPlayers.map((player, index) => ({
              ...player,
              isCurrentTurn: index === nextPlayerIndexAfterSettle
            }));
            const allSettled = nextPlayersAfterSettle.every(player => player.isSettled);

            return {
              ...prev,
              players: nextPlayersAfterSettle,
              currentPlayerIndex: nextPlayerIndexAfterSettle,
              selectedPiece: null,
              selectedPiecePosition: null,
              timeLeft: gameSettings.timeLimit,
              turnCount: prev.turnCount + 1,
              gamePhase: allSettled ? 'finished' : prev.gamePhase
            };
          }

          // 人类玩家超时，跳过当前回合
          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players);

          // 兜底：如果没有其他可行动玩家，避免回到自己导致超时循环
          if (nextPlayerIndex === prev.currentPlayerIndex) {
            const settledPlayers = prev.players.map((player, index) => ({
              ...player,
              isSettled: index === prev.currentPlayerIndex ? true : player.isSettled
            }));
            const fallbackNextIndex = findNextActivePlayer(prev.currentPlayerIndex, settledPlayers);
            const fallbackPlayers = settledPlayers.map((player, index) => ({
              ...player,
              isCurrentTurn: index === fallbackNextIndex
            }));
            const allSettled = fallbackPlayers.every(player => player.isSettled);

            return {
              ...prev,
              players: fallbackPlayers,
              currentPlayerIndex: fallbackNextIndex,
              selectedPiece: null,
              selectedPiecePosition: null,
              timeLeft: gameSettings.timeLimit,
              turnCount: prev.turnCount + 1,
              gamePhase: allSettled ? 'finished' : prev.gamePhase
            };
          }

          const nextPlayers = prev.players.map((player, index) => ({
            ...player,
            isCurrentTurn: index === nextPlayerIndex
          }));
          return {
            ...prev,
            players: nextPlayers,
            currentPlayerIndex: nextPlayerIndex,
            selectedPiece: null,
            selectedPiecePosition: null,
            timeLeft: gameSettings.timeLimit,
            turnCount: prev.turnCount + 1
          };
        }
        
        // 最后10秒倒计时警告
        if (prev.timeLeft <= 10 && prev.timeLeft > 0) {
          soundManager.timeWarning();
        }
        
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.gamePhase, gameState.currentPlayerIndex, gameState.players, findNextActivePlayer, gameSettings.timeLimit]);
  
  // 检查游戏是否结束
  useEffect(() => {
    if (isGameFinished(gameState.players)) {
      // 判断玩家是否获胜
      const humanScore = gameState.players[0]?.score || 0;
      const maxScore = Math.max(...gameState.players.map(p => p.score));
      if (humanScore === maxScore) {
        soundManager.gameWin();
      } else {
        soundManager.gameLose();
      }
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished'
      }));
    }
  }, [gameState.players]);
  
  // 当所有玩家都无法继续时，自动将所有人标记为已结算，触发游戏结束
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const allPlayersStuck = gameState.players.every(player => 
      player.isSettled || !canPlayerContinue(player)
    );
    
    if (allPlayersStuck) {
      // 短暂延迟后自动结算，给玩家一个反应时间
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(player => ({
            ...player,
            isSettled: true
          })),
          gamePhase: 'finished'
        }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, gameState.players, canPlayerContinue]);
  
  // 自动检测当前玩家是否可以继续，如果不能则自动结算
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 只检查人类玩家（红色），AI有自己的逻辑
    if (currentPlayer.color === 'red' && !currentPlayer.isSettled) {
      // 使用 setTimeout 避免在渲染过程中更新状态
      const timer = setTimeout(() => {
        if (!canPlayerContinue(currentPlayer)) {
          // 播放提示音
          soundManager.invalidMove(); // 或者使用专门的提示音
          // 自动结算
          settlePlayer();
          // 可以添加一个 Toast 提示用户 "无路可走，自动结算"
        }
      }, 1000); // 给一点延迟，让玩家看清局面
      
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, canPlayerContinue, settlePlayer, gameState.players]);

  // 自动处理AI回合
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && 
        gameState.players[gameState.currentPlayerIndex].color !== 'red' &&
        !gameState.players[gameState.currentPlayerIndex].isSettled) {
      processAITurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, processAITurn, gameState.players]);

  // 轮到人类玩家时播放提示音
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && 
        gameState.players[gameState.currentPlayerIndex].color === 'red' &&
        gameState.turnCount > 1) { // 不在游戏第一回合播放
      soundManager.yourTurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.turnCount, gameState.players]);
  
  // 找到拼图在原始拼图库中的形状索引
  const findShapeIndex = useCallback((transformedPiece: Piece, originalPieces: Piece[]): number => {
    // 找到对应的原始拼图
    const originalPiece = originalPieces.find(p => p.id === transformedPiece.id);
    if (!originalPiece) return 0;
    
    // 获取该类型拼图的所有可能形状
    const shapes = PIECE_SHAPES[originalPiece.type as keyof typeof PIECE_SHAPES];
    if (!shapes) return 0;
    
    // 比较形状，找到匹配的索引
    for (let i = 0; i < shapes.length; i++) {
      if (arraysEqual(shapes[i], transformedPiece.shape)) {
        return i;
      }
    }
    
    return 0; // 如果没找到匹配的，返回默认值
  }, []);
  
  // 比较两个二维数组是否相等
  const arraysEqual = useCallback((a: number[][], b: number[][]): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].length !== b[i].length) return false;
      for (let j = 0; j < a[i].length; j++) {
        if (a[i][j] !== b[i][j]) return false;
      }
    }
    return true;
  }, []);

  // 更新玩家名称的语言
  const updatePlayerNamesLanguage = useCallback((language: string) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(player => ({
        ...player,
        name: getLocalizedPlayerName(player.color, language)
      }))
    }));
  }, []);

  // Cleanup AI timeouts on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const isPausedRef = useRef(false);
  const setPaused = useCallback((paused: boolean) => { isPausedRef.current = paused; }, []);

  return {
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    resetGame,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    lastAIMove,
    canPlayerContinue,
    gameSettings,
    currentTurnTime: gameState.timeLeft,
    updatePlayerNamesLanguage,
    setPaused,
  };
}