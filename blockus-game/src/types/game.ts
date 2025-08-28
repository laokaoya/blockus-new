// 游戏核心数据类型定义

export type PlayerColor = 'red' | 'yellow' | 'blue' | 'green';

export type PieceType = 1 | 2 | 3 | 4 | 5;

export interface Piece {
  id: string;
  type: PieceType;
  shape: number[][];
  color: PlayerColor;
  isUsed: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  pieces: Piece[];
  score: number;
  isSettled: boolean;
  isCurrentTurn: boolean;
}

export interface GameMove {
  playerColor: PlayerColor;
  boardChanges: Array<{
    x: number;
    y: number;
    color: number; // 0=空, 1=红, 2=黄, 3=蓝, 4=绿
  }>;
  timestamp: number;
}

export interface GameState {
  board: number[][]; // 0=空, 1=红, 2=黄, 3=蓝, 4=绿
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: 'waiting' | 'playing' | 'settling' | 'finished';
  turnTimeLimit: number;
  timeLeft: number;
  selectedPiece: Piece | null;
  selectedPiecePosition: { x: number; y: number } | null;
  turnCount: number; // 当前回合数
  moves: GameMove[]; // 游戏移动记录
}

export interface Position {
  x: number;
  y: number;
}

export interface GameSettings {
  boardSize: number;
  turnTimeLimit: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  showHints: boolean;
  soundEnabled: boolean;
}
