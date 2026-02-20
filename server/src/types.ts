// 服务端共享类型定义 - 与前端 types/game.ts 保持一致

export type PlayerColor = 'red' | 'yellow' | 'blue' | 'green';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  type: 1 | 2 | 3 | 4 | 5;
  shape: number[][];
  color: PlayerColor;
  isUsed: boolean;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  boardSize: number;
  turnTimeLimit: number;
  aiDifficulty: AIDifficulty;
  timeLimit: number;
  showHints: boolean;
  soundEnabled: boolean;
  allowSpectators: boolean;
  privateRoom: boolean;
}

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatar?: string;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  isReady: boolean;
  color?: PlayerColor;
  /** 断线离线，保留位置待重连 */
  isOffline?: boolean;
  disconnectedAt?: number;
}

export type GameMode = 'classic' | 'creative';

export interface GameRoom {
  id: string;
  name: string;
  password?: string;
  hostId: string;
  players: RoomPlayer[];
  spectators: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  gameMode: GameMode;
  gameSettings: GameSettings;
  createdAt: number;
  lastActivityAt: number;
  /** 最后有真人活跃的时间，用于 120 秒无活跃则销毁 */
  lastActiveHumanAt?: number;
}

export interface GameMove {
  playerColor: PlayerColor;
  pieceId: string;
  position: { x: number; y: number };
  boardChanges: Array<{
    x: number;
    y: number;
    color: number;
  }>;
  timestamp: number;
}

export interface GameState {
  board: number[][];
  currentPlayerIndex: number;
  gamePhase: 'waiting' | 'playing' | 'settling' | 'finished';
  turnCount: number;
  moves: GameMove[];
  playerScores: Record<string, number>;
  settledPlayers: string[];
  /** 创意模式专用状态（gameMode=creative 时存在） */
  creativeState?: import('./utils/creativeTypes').CreativeGameState;
}

// JWT payload
export interface TokenPayload {
  userId: string;
  nickname: string;
  avatar?: string;
  iat?: number;
  exp?: number;
}

// Socket 事件类型
export interface ServerToClientEvents {
  // 房间事件
  'room:list': (rooms: GameRoom[]) => void;
  'room:updated': (room: GameRoom) => void;
  'room:deleted': (roomId: string) => void;
  'room:playerJoined': (data: { roomId: string; player: RoomPlayer }) => void;
  'room:playerLeft': (data: { roomId: string; playerId: string }) => void;
  'room:chat': (data: { roomId: string; senderId: string; senderName: string; content: string; timestamp: number; type: 'chat' | 'system' }) => void;

  // 游戏事件
  'game:started': (data: { roomId: string; gameState: GameState; playerColors: Record<string, PlayerColor>; playerNames: Record<string, string> }) => void;
  'game:state': (data: { roomId: string; gameState: GameState; playerColors: Record<string, PlayerColor>; playerNames: Record<string, string>; isPaused?: boolean }) => void;
  'game:move': (data: { roomId: string; move: GameMove; gameState: GameState }) => void;
  'game:itemUsed': (data: { roomId: string; gameState: GameState; pieceIdUnused?: string; pieceIdRemoved?: string; targetPlayerId?: string }) => void;
  'game:turnChanged': (data: { roomId: string; currentPlayerIndex: number; timeLeft: number; creativeState?: import('./utils/creativeTypes').CreativeGameState }) => void;
  'game:creativeState': (data: { roomId: string; creativeState: import('./utils/creativeTypes').CreativeGameState }) => void;
  'game:playerSettled': (data: { roomId: string; playerId: string }) => void;
  'game:finished': (data: { roomId: string; gameState: GameState; rankings: Array<{ playerId: string; nickname: string; color: PlayerColor; score: number; rank: number }> }) => void;
  'game:timeUpdate': (data: { roomId: string; timeLeft: number }) => void;
  'game:paused': (data: { roomId: string; reason: string }) => void;
  'game:resumed': (data: { roomId: string }) => void;
  'room:playerOffline': (data: { roomId: string; playerId: string }) => void;
  'room:playerOnline': (data: { roomId: string; playerId: string }) => void;

  // 系统事件
  'error': (data: { message: string; code?: string }) => void;
  'authenticated': (data: { userId: string; nickname: string }) => void;
}

export interface ClientToServerEvents {
  // 认证
  'auth:login': (data: { nickname: string; avatar?: string }, callback: (response: { success: boolean; token?: string; userId?: string; error?: string }) => void) => void;

  // 房间操作
  'room:list': (callback: (rooms: GameRoom[]) => void) => void;
  'room:create': (data: { name: string; password?: string; settings?: Partial<GameSettings>; gameMode?: string }, callback: (response: { success: boolean; room?: GameRoom; error?: string }) => void) => void;
  'room:join': (data: { roomId: string; password?: string }, callback: (response: { success: boolean; room?: GameRoom; error?: string }) => void) => void;
  'room:leave': (data: { roomId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:update': (data: { roomId: string; updates: Partial<GameRoom> }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:addAI': (data: { roomId: string; aiDifficulty: AIDifficulty }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:removePlayer': (data: { roomId: string; playerId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'room:chat': (data: { roomId: string; content: string }) => void;
  'room:ready': (data: { roomId: string; isReady: boolean }, callback: (response: { success: boolean; error?: string }) => void) => void;

  // 游戏操作
  'game:start': (data: { roomId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:getState': (data: { roomId: string }) => void;
  'game:move': (data: { roomId: string; move: GameMove }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:useItemCard': (data: { roomId: string; cardIndex: number; targetPlayerId?: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:settle': (data: { roomId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:spectate': (data: { roomId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:skipItemPhase': (data: { roomId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
}
