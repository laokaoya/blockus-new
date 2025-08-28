// 游戏状态管理Hook

import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, Piece, Position, PlayerColor } from '../types/game';
import { PIECE_SHAPES, PIECE_COUNTS, PLAYER_COLORS, PLAYER_NAMES } from '../constants/pieces';
import { canPlacePiece, placePiece, calculateScore, isGameFinished, getWinner } from '../utils/gameEngine';
import { AIPlayer } from '../utils/aiPlayer';
import { rotatePiece, flipPiece } from '../utils/pieceTransformations';

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
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
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
  const [thinkingAI, setThinkingAI] = useState<string | null>(null); // AI思考状态
  
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
      isCurrentTurn: false
    };
  }
  
  // 选择拼图
  const selectPiece = useCallback((piece: Piece | null) => {
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece
    }));
  }, []);

  // 旋转拼图
  const rotateSelectedPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.selectedPiece) return prev;
      
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
      
      return {
        ...prev,
        selectedPiece: flipPiece(prev.selectedPiece)
      };
    });
  }, []);
  
  // 放置拼图
  const placePieceOnBoard = useCallback((position: Position) => {
    if (!gameState.selectedPiece) return false;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const colorIndex = gameState.currentPlayerIndex + 1;
    
    // 检查是否是当前玩家的回合
    if (!currentPlayer.isCurrentTurn) return false;
    
    if (!canPlacePiece(gameState.board, gameState.selectedPiece, position, colorIndex)) {
      return false;
    }
    
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
      timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? gameSettings.timeLimit : prev.timeLeft,
      turnCount: prev.turnCount + 1, // 增加回合计数
      moves: [...prev.moves, {
        playerColor: currentPlayer.color,
        boardChanges: boardChanges,
        timestamp: Date.now()
      }]
    }));
    
    return true;
  }, [gameState]);
  
    // AI回合
  const processAITurn = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 跳过玩家回合和已结算的AI
    if (currentPlayer.color === 'red' || currentPlayer.isSettled) return;
    
    // 设置AI思考状态
    setThinkingAI(currentPlayer.color);
    
    // AI思考时间根据回合数调整：前8回合2-3秒，之后3-5秒
    let thinkingTime;
    if (gameState.turnCount <= 8) {
      thinkingTime = Math.random() * 1000 + 2000; // 2000-3000ms
    } else {
      thinkingTime = Math.random() * 2000 + 3000; // 3000-5000ms
    }
    
    setTimeout(() => {
      const aiPlayer = aiPlayers.find(ai => ai.getColor() === currentPlayer.color);
      if (!aiPlayer) return;
      
      const move = aiPlayer.makeMove(gameState.board, currentPlayer.pieces);
      
      if (move) {
        // AI放置拼图
        const colorIndex = gameState.currentPlayerIndex + 1;
        const newBoard = placePiece(gameState.board, move.piece, move.position, colorIndex);
        
        // 更新玩家状态
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
        
        // 进入下一回合
        const nextPlayerIndex = findNextActivePlayer(gameState.currentPlayerIndex, newPlayers);
        const nextPlayers = newPlayers.map((player, index) => ({
          ...player,
          isCurrentTurn: index === nextPlayerIndex
        }));
        
        // 计算AI移动的棋盘变化
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
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          players: nextPlayers,
          currentPlayerIndex: nextPlayerIndex,
          timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? gameSettings.timeLimit : prev.timeLeft,
          turnCount: prev.turnCount + 1, // 增加回合计数
          moves: [...prev.moves, {
            playerColor: currentPlayer.color,
            boardChanges: boardChanges,
            timestamp: Date.now()
          }]
        }));
      } else {
        // AI无法放置拼图，进入结算
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
          timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? gameSettings.timeLimit : prev.timeLeft,
          turnCount: prev.turnCount + 1 // 增加回合计数
        }));
      }
      
      // 清除AI思考状态
      setThinkingAI(null);
    }, thinkingTime);
  }, [gameState, aiPlayers]);
  
  // 结算玩家
  const settlePlayer = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.color !== 'red') return;
    
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
      timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? gameSettings.timeLimit : prev.timeLeft,
      turnCount: prev.turnCount + 1 // 增加回合计数
    }));
  }, [gameState]);
  
  // 检查玩家是否可以继续放置拼图
  const canPlayerContinue = useCallback((player: Player) => {
    if (player.isSettled) return false;
    
    const availablePieces = player.pieces.filter(p => !p.isUsed);
    if (availablePieces.length === 0) return false;
    
    for (const piece of availablePieces) {
      for (let y = 0; y < gameState.board.length; y++) {
        for (let x = 0; x < gameState.board[y].length; x++) {
          const colorIndex = gameState.players.findIndex(p => p.id === player.id) + 1;
          if (canPlacePiece(gameState.board, piece, { x, y }, colorIndex)) {
            return true;
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
  
  // 重置游戏
  const resetGame = useCallback(() => {
    setGameState(initializeGameState());
    setThinkingAI(null); // 清除AI思考状态
  }, [gameSettings]);

  // 当游戏设置改变时，重新初始化游戏状态
  useEffect(() => {
    setGameState(initializeGameState());
  }, [gameSettings]);
  
  // 倒计时 - 只有人类玩家有时间限制
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 只有人类玩家（红色）有时间限制
    if (currentPlayer.color !== 'red') return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // 人类玩家超时，但不立即结算，而是跳过当前回合
          // 让玩家有机会在下一轮重新尝试
          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players);
          return {
            ...prev,
            players: prev.players.map((player, index) => ({
              ...player,
              isCurrentTurn: index === nextPlayerIndex
            })),
            currentPlayerIndex: nextPlayerIndex,
            timeLeft: nextPlayerIndex === 0 ? gameSettings.timeLimit : prev.timeLeft,
            turnCount: prev.turnCount + 1
          };
        }
        
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.gamePhase, gameState.currentPlayerIndex, findNextActivePlayer, gameSettings.timeLimit]);
  
  // 检查游戏是否结束
  useEffect(() => {
    if (isGameFinished(gameState.players)) {
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished'
      }));
    }
  }, [gameState.players]);
  
  // 检查是否所有玩家都无法继续 - 但不自动结算，只提示
  useEffect(() => {
    if (gameState.gamePhase === 'playing') {
      const allPlayersStuck = gameState.players.every(player => 
        player.isSettled || !canPlayerContinue(player)
      );
      
      if (allPlayersStuck) {
        // 所有玩家都无法继续，但不自动结算
        // 游戏继续，等待玩家主动结算
        console.log('所有玩家都无法继续，请主动结算');
      }
    }
  }, [gameState.gamePhase, gameState.players, canPlayerContinue]);
  
  // 自动处理AI回合
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && 
        gameState.players[gameState.currentPlayerIndex].color !== 'red' &&
        !gameState.players[gameState.currentPlayerIndex].isSettled) {
      processAITurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, processAITurn]);
  
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

  return {
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    resetGame,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    canPlayerContinue,
    gameSettings,
    currentTurnTime: gameState.timeLeft,
    updatePlayerNamesLanguage
  };
}
