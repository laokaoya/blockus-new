// 游戏状态管理Hook

import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, Piece, Position, PlayerColor } from '../types/game';
import { PIECE_SHAPES, PIECE_COUNTS, PLAYER_COLORS, PLAYER_NAMES } from '../constants/pieces';
import { canPlacePiece, placePiece, calculateScore, isGameFinished, getWinner } from '../utils/gameEngine';
import { AIPlayer } from '../utils/aiPlayer';

const BOARD_SIZE = 20;
const TURN_TIME_LIMIT = 30;

export function useGameState() {
  // 初始化游戏状态
  const [gameState, setGameState] = useState<GameState>(() => initializeGameState());
  const [aiPlayers, setAiPlayers] = useState<AIPlayer[]>([]);
  
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
  const selectPiece = useCallback((piece: Piece) => {
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece
    }));
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
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
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
    
    // 跳过玩家回合
    if (currentPlayer.color === 'red') return;
    
    // AI立即执行移动，无需延迟
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
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
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
      const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
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
  }, [gameState, aiPlayers]);
  
  // 结算玩家
  const settlePlayer = useCallback(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.color !== 'red') return;
    
    const newPlayers = gameState.players.map(player => 
      player.id === currentPlayer.id ? { ...player, isSettled: true } : player
    );
    
    // 进入下一回合
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
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
          return {
            ...prev,
            players: prev.players.map(player => 
              player.id === currentPlayer.id ? { ...player, isSettled: true } : player
            ),
            currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
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
  
  // 自动处理AI回合
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && 
        gameState.players[gameState.currentPlayerIndex].color !== 'red') {
      processAITurn();
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, processAITurn]);
  
  return {
    gameState,
    selectPiece,
    placePieceOnBoard,
    settlePlayer,
    resetGame
  };
}
