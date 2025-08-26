// 游戏状态管理Hook

import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, Piece, Position, PlayerColor } from '../types/game';
import { PIECE_SHAPES, PIECE_COUNTS, PLAYER_COLORS, PLAYER_NAMES } from '../constants/pieces';
import { canPlacePiece, placePiece, calculateScore, isGameFinished, getWinner } from '../utils/gameEngine';
import { AIPlayer } from '../utils/aiPlayer';
import { rotatePiece, flipPiece } from '../utils/pieceTransformations';
const BOARD_SIZE = 20;
const TURN_TIME_LIMIT = 60; // 人类玩家时间改为60秒

export function useGameState() {
  // 初始化游戏状态
  const [gameState, setGameState] = useState<GameState>(() => initializeGameState());
  const [aiPlayers, setAiPlayers] = useState<AIPlayer[]>([]);
  const [thinkingAI, setThinkingAI] = useState<string | null>(null); // AI思考状态
  
  // 初始化AI玩家
  useEffect(() => {
    const ais = [
      new AIPlayer('yellow'),
      new AIPlayer('blue'),
      new AIPlayer('green')
    ];
    setAiPlayers(ais);
  }, []);
  
  // 初始化游戏状态
  function initializeGameState(): GameState {
    const players: Player[] = [
      createPlayer('red', '玩家'),
      createPlayer('yellow', 'AI-小黄'),
      createPlayer('blue', 'AI-小蓝'),
      createPlayer('green', 'AI-小绿')
    ];
    
    // 设置第一个玩家为当前回合
    players[0].isCurrentTurn = true;
    
    return {
      board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)),
      players,
      currentPlayerIndex: 0,
      gamePhase: 'playing',
      turnTimeLimit: TURN_TIME_LIMIT,
      timeLeft: TURN_TIME_LIMIT,
      selectedPiece: null,
      selectedPiecePosition: null
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
    
    if (!canPlacePiece(gameState.board, gameState.selectedPiece, position, colorIndex)) {
      return false;
    }
    
    // 放置拼图
    const newBoard = placePiece(gameState.board, gameState.selectedPiece, position, colorIndex);
    
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
       timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? TURN_TIME_LIMIT : prev.timeLeft
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
    
    // AI随机思考时间3-5秒
    const thinkingTime = Math.random() * 2000 + 3000; // 3000-5000ms
    
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
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          players: nextPlayers,
          currentPlayerIndex: nextPlayerIndex,
          timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? TURN_TIME_LIMIT : prev.timeLeft
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
          timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? TURN_TIME_LIMIT : prev.timeLeft
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
      timeLeft: nextPlayers[nextPlayerIndex].color === 'red' ? TURN_TIME_LIMIT : prev.timeLeft
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
  }, []);
  
  // 倒计时 - 只有人类玩家有时间限制
  useEffect(() => {
    if (gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // 只有人类玩家（红色）有时间限制
    if (currentPlayer.color !== 'red') return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // 人类玩家超时，自动结算
          const newPlayers = prev.players.map(player => 
            player.id === currentPlayer.id ? { ...player, isSettled: true } : player
          );
          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, newPlayers);
          return {
            ...prev,
            players: newPlayers.map((player, index) => ({
              ...player,
              isCurrentTurn: index === nextPlayerIndex
            })),
            currentPlayerIndex: nextPlayerIndex,
            timeLeft: TURN_TIME_LIMIT
          };
        }
        
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.gamePhase, gameState.currentPlayerIndex]);
  
  // 检查游戏是否结束
  useEffect(() => {
    if (isGameFinished(gameState.players)) {
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished'
      }));
    }
  }, [gameState.players]);
  
  // 检查是否所有玩家都无法继续
  useEffect(() => {
    if (gameState.gamePhase === 'playing') {
      const allPlayersStuck = gameState.players.every(player => 
        player.isSettled || !canPlayerContinue(player)
      );
      
      if (allPlayersStuck) {
        // 自动结算所有无法继续的玩家
        const updatedPlayers = gameState.players.map(player => ({
          ...player,
          isSettled: player.isSettled || !canPlayerContinue(player)
        }));
        
        setGameState(prev => ({
          ...prev,
          players: updatedPlayers,
          gamePhase: 'finished'
        }));
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
  
  return {
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    resetGame,
    rotateSelectedPiece,
    flipSelectedPiece,
    thinkingAI,
    canPlayerContinue
  };
}
