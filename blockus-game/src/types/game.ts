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
  isAI?: boolean;
}

export interface GameMove {
  playerColor: PlayerColor;
  pieceId?: string;
  position?: { x: number; y: number };
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

// 用户相关类型
export interface UserProfile {
  id: string;
  nickname: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  location?: string;
  avatar?: string; // 头像图片的base64或URL
  bio?: string; // 一句话介绍
  createdAt: number;
  lastLoginAt: number;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
  averageScore: number;
  totalPlayTime: number; // 总游戏时长（分钟）
}

export interface User {
  profile: UserProfile;
  stats: UserStats;
}

// 房间相关类型
export interface RoomPlayer {
  id: string;
  nickname: string;
  avatar?: string;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  isReady: boolean;
  color?: PlayerColor;
}

export interface GameRoom {
  id: string;
  name: string;
  password?: string;
  hostId: string;
  players: RoomPlayer[];
  spectators?: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  gameSettings: GameSettings;
  createdAt: number;
  lastActivityAt: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'system';
}

// 扩展游戏设置类型
export interface GameSettings {
  boardSize: number;
  turnTimeLimit: number;
  aiDifficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  showHints: boolean;
  soundEnabled: boolean;
  allowSpectators: boolean;
  privateRoom: boolean;
}
