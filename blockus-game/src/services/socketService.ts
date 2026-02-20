import { io, Socket } from 'socket.io-client';
import { GameRoom, RoomPlayer, GameSettings, PlayerColor } from '../types/game';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || (
  process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001'
);

// 创意模式状态（与服务端 creativeTypes 一致）
export interface ServerCreativeState {
  specialTiles: Array<{ x: number; y: number; type: string; used: boolean }>;
  creativePlayers: Array<{
    playerId: string;
    color: string;
    itemCards: any[];
    statusEffects: any[];
    bonusScore: number;
  }>;
  itemPhase: boolean;
  itemPhaseTimeLeft: number;
  pendingEffect: any;
  lastTriggeredTile: any;
}

// 服务端游戏状态（精简版）
export interface ServerGameState {
  board: number[][];
  currentPlayerIndex: number;
  gamePhase: 'waiting' | 'playing' | 'settling' | 'finished';
  turnCount: number;
  moves: any[];
  playerScores: Record<string, number>;
  settledPlayers: string[];
  creativeState?: ServerCreativeState;
}

export interface GameRanking {
  playerId: string;
  nickname: string;
  color: PlayerColor;
  score: number;
  rank: number;
}

type EventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();
  private _isConnected: boolean = false;

  // 连接到服务器
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(SERVER_URL, {
        auth: token ? { token } : {},
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to server');
        this._isConnected = true;
        this.trigger('connectionChange', true);
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        this._isConnected = false;
        this.trigger('connectionChange', false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
        this._isConnected = false;
        this.trigger('connectionChange', false);
        reject(error);
      });

      this.socket.on('error', (data: { message: string; code?: string }) => {
        console.error('[Socket] Server error:', data);
        this.trigger('serverError', data);
      });

      this.socket.on('authenticated', (data) => {
        console.log('[Socket] Authenticated:', data);
        this.trigger('authenticated', data);
      });

      // 房间事件转发
      this.socket.on('room:list', (rooms) => this.trigger('room:list', rooms));
      this.socket.on('room:updated', (room) => this.trigger('room:updated', room));
      this.socket.on('room:deleted', (roomId) => this.trigger('room:deleted', roomId));
      this.socket.on('room:playerJoined', (data) => this.trigger('room:playerJoined', data));
      this.socket.on('room:playerLeft', (data) => this.trigger('room:playerLeft', data));
      this.socket.on('room:chat', (data) => this.trigger('room:chat', data));

      // 游戏事件转发
      this.socket.on('game:started', (data) => this.trigger('game:started', data));
      this.socket.on('game:state', (data) => this.trigger('game:state', data));
      this.socket.on('game:move', (data) => this.trigger('game:move', data));
      this.socket.on('game:turnChanged', (data) => this.trigger('game:turnChanged', data));
      this.socket.on('game:playerSettled', (data) => this.trigger('game:playerSettled', data));
      this.socket.on('game:finished', (data) => this.trigger('game:finished', data));
      this.socket.on('game:timeUpdate', (data) => this.trigger('game:timeUpdate', data));
      this.socket.on('game:paused', (data) => this.trigger('game:paused', data));
      this.socket.on('game:resumed', (data) => this.trigger('game:resumed', data));
      this.socket.on('room:playerOffline', (data) => this.trigger('room:playerOffline', data));
      this.socket.on('room:playerOnline', (data) => this.trigger('room:playerOnline', data));

      // 超时处理
      setTimeout(() => {
        if (!this._isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected = false;
    }
  }

  // 是否已连接
  get isConnected(): boolean {
    return this._isConnected;
  }

  // ===================== 认证 =====================
  login(nickname: string, avatar?: string): Promise<{ success: boolean; token?: string; userId?: string; error?: string }> {
    return this.emitWithCallback('auth:login', { nickname, avatar });
  }

  // ===================== 房间操作 =====================
  getRooms(): Promise<GameRoom[]> {
    return this.emitWithCallback('room:list');
  }

  createRoom(name: string, password?: string, settings?: Partial<GameSettings>, gameMode?: string): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
    return this.emitWithCallback('room:create', { name, password, settings, gameMode: gameMode || 'classic' });
  }

  joinRoom(roomId: string, password?: string): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
    return this.emitWithCallback('room:join', { roomId, password });
  }

  leaveRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('room:leave', { roomId });
  }

  updateRoom(roomId: string, updates: Partial<GameRoom>): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('room:update', { roomId, updates });
  }

  addAI(roomId: string, aiDifficulty: 'easy' | 'medium' | 'hard'): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('room:addAI', { roomId, aiDifficulty });
  }

  removePlayer(roomId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('room:removePlayer', { roomId, playerId });
  }

  sendChat(roomId: string, content: string): void {
    this.socket?.emit('room:chat', { roomId, content });
  }

  setReady(roomId: string, isReady: boolean): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('room:ready', { roomId, isReady });
  }

  // ===================== 游戏操作 =====================
  startGame(roomId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('game:start', { roomId });
  }

  sendMove(roomId: string, move: any): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('game:move', { roomId, move });
  }

  settlePlayer(roomId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('game:settle', { roomId });
  }

  useItemCard(roomId: string, cardIndex: number, targetPlayerId?: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('game:useItemCard', { roomId, cardIndex, targetPlayerId });
  }

  spectateGame(roomId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithCallback('game:spectate', { roomId });
  }

  // ===================== 事件系统 =====================
  public emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(event)?.delete(callback);
    };
  }

  off(event: string, callback: EventCallback): void {
    this.eventHandlers.get(event)?.delete(callback);
  }

  private trigger(event: string, ...args: any[]): void {
    this.eventHandlers.get(event)?.forEach(cb => {
      try {
        cb(...args);
      } catch (error) {
        console.error(`[Socket] Error in event handler for ${event}:`, error);
      }
    });
  }

  // 带回调的 emit（Promise 封装）
  private emitWithCallback<T = any>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${event}`));
      }, 10000);

      if (data !== undefined) {
        this.socket.emit(event as any, data, (response: T) => {
          clearTimeout(timeout);
          resolve(response);
        });
      } else {
        this.socket.emit(event as any, (response: T) => {
          clearTimeout(timeout);
          resolve(response);
        });
      }
    });
  }
}

// 单例导出
const socketService = new SocketService();
export default socketService;
