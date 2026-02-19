import { v4 as uuidv4 } from 'uuid';
import { GameRoom, RoomPlayer, GameSettings, AIDifficulty, PlayerColor } from './types';

const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow', 'blue', 'green'];

const DEFAULT_SETTINGS: GameSettings = {
  boardSize: 20,
  turnTimeLimit: 60,
  aiDifficulty: 'medium',
  timeLimit: 300,
  showHints: true,
  soundEnabled: true,
  allowSpectators: true,
  privateRoom: false,
};

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  onRoomDeleted?: (roomId: string) => void;

  constructor() {
    // 每 5 分钟清理过期房间（超过 2 小时无活动的）
    this.cleanupInterval = setInterval(() => this.cleanupOldRooms(), 5 * 60 * 1000);
  }

  // 获取所有公开房间列表
  getPublicRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
      .filter(room => !room.gameSettings.privateRoom)
      .map(room => this.sanitizeRoom(room));
  }

  // 获取房间（含密码，内部使用）
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  // 获取房间（不含密码，外部使用）
  getRoomSafe(roomId: string): GameRoom | undefined {
    const room = this.rooms.get(roomId);
    return room ? this.sanitizeRoom(room) : undefined;
  }

  // 检查玩家是否在任何房间中
  // 返回所在的 roomId，如果不在任何房间则返回 undefined
  getPlayerRoomId(userId: string): string | undefined {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.some(p => p.id === userId)) {
        return roomId;
      }
    }
    return undefined;
  }

  // 创建房间
  createRoom(hostId: string, hostNickname: string, name: string, password?: string, settings?: Partial<GameSettings>, gameMode?: string): GameRoom | null {
    // 检查玩家是否已经在其他房间
    const existingRoomId = this.getPlayerRoomId(hostId);
    if (existingRoomId) {
      // 玩家已在房间中，不允许创建新房间
      // 这里返回 null 或抛出错误，由调用者处理
      // 为了保持接口一致性，这里我们抛出一个特定的错误，或者返回 null 并在 socketHandlers 中处理
      // 这里的返回类型是 GameRoom，所以我们可能需要修改返回类型或者抛出异常
      // 让我们修改 createRoom 的签名或者抛出异常
      throw new Error(`ALREADY_IN_ROOM:${existingRoomId}`);
    }

    const roomId = `room_${uuidv4().substring(0, 8)}`;
    
    const hostPlayer: RoomPlayer = {
      id: hostId,
      nickname: hostNickname,
      isHost: true,
      isAI: false,
      isReady: true,
      color: PLAYER_COLORS[0],
    };

    const room: GameRoom = {
      id: roomId,
      name,
      password: password || undefined,
      hostId,
      players: [hostPlayer],
      spectators: [],
      maxPlayers: 4,
      status: 'waiting',
      gameMode: (gameMode === 'creative' ? 'creative' : 'classic') as any,
      gameSettings: { ...DEFAULT_SETTINGS, ...settings, privateRoom: settings?.privateRoom || false },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    return this.sanitizeRoom(room);
  }

  // 加入房间
  joinRoom(roomId: string, userId: string, nickname: string, password?: string): { success: boolean; error?: string; room?: GameRoom } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
    
    // 检查是否是重连（玩家已在房间中）
    const existingPlayer = room.players.find(p => p.id === userId);
    if (existingPlayer) {
      // 如果游戏正在进行，允许重连
      if (room.status === 'playing') {
        return { success: true, room: this.sanitizeRoom(room) };
      }
      // 如果是等待状态，也允许重连（可能是刷新页面）
      return { success: true, room: this.sanitizeRoom(room) };
    }

    // 检查玩家是否已经在其他房间
    const existingRoomId = this.getPlayerRoomId(userId);
    if (existingRoomId && existingRoomId !== roomId) {
      return { success: false, error: `ALREADY_IN_ROOM:${existingRoomId}` };
    }

    if (room.status !== 'waiting') return { success: false, error: 'GAME_ALREADY_STARTED' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'ROOM_FULL' };
    if (room.password && room.password !== password) return { success: false, error: 'WRONG_PASSWORD' };

    // 分配颜色：找到第一个未使用的颜色
    const usedColors = room.players.map(p => p.color);
    const availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c));

    const newPlayer: RoomPlayer = {
      id: userId,
      nickname,
      isHost: false,
      isAI: false,
      isReady: false,
      color: availableColor,
    };

    room.players.push(newPlayer);
    room.lastActivityAt = Date.now();

    return { success: true, room: this.sanitizeRoom(room) };
  }

  // 离开房间（玩家或观战者）
  // isDisconnect: 是否是意外断线（如果是，且游戏进行中，则保留玩家在房间内以便重连）
  leaveRoom(roomId: string, userId: string, isDisconnect: boolean = false): { success: boolean; deleted: boolean; newHostId?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, deleted: false };

    // 检查是否是观战者
    const isSpectator = room.spectators.includes(userId);
    if (isSpectator) {
      room.spectators = room.spectators.filter(id => id !== userId);
      room.lastActivityAt = Date.now();
      return { success: true, deleted: false };
    }

    // 如果游戏正在进行中，且是意外断线，则不移除玩家，允许重连
    if (isDisconnect && room.status === 'playing') {
      // 可以在这里标记玩家为离线状态，但目前只需保留其在 players 列表中即可
      return { success: true, deleted: false };
    }

    room.players = room.players.filter(p => p.id !== userId);
    room.lastActivityAt = Date.now();

    // 所有真人玩家都走了，自动销毁房间（不管是否还有 AI）
    if (room.players.filter(p => !p.isAI).length === 0) {
      this.rooms.delete(roomId);
      return { success: true, deleted: true };
    }

    // 如果离开的是房主，转移房主
    if (room.hostId === userId) {
      const newHost = room.players.find(p => !p.isAI);
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
        return { success: true, deleted: false, newHostId: newHost.id };
      }
    }

    return { success: true, deleted: false };
  }

  // 添加观战者
  addSpectator(roomId: string, userId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
    if (room.status !== 'playing') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (room.spectators.includes(userId)) return { success: false, error: 'ALREADY_SPECTATING' };
    if (room.players.some(p => p.id === userId)) return { success: false, error: 'ALREADY_IN_ROOM' };

    room.spectators.push(userId);
    room.lastActivityAt = Date.now();
    return { success: true };
  }

  // 移除观战者
  removeSpectator(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.spectators = room.spectators.filter(id => id !== userId);
    }
  }

  // 检查用户是否是观战者
  isSpectator(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.spectators.includes(userId) : false;
  }

  // 添加 AI 玩家
  addAI(roomId: string, requesterId: string, aiDifficulty: AIDifficulty): { success: boolean; error?: string; room?: GameRoom } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
    if (room.hostId !== requesterId) return { success: false, error: 'NOT_HOST' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'ROOM_FULL' };

    const usedColors = room.players.map(p => p.color);
    const availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c));

    const aiPlayer: RoomPlayer = {
      id: `ai_${uuidv4().substring(0, 6)}`,
      nickname: `AI (${aiDifficulty})`,
      isHost: false,
      isAI: true,
      aiDifficulty,
      isReady: true,
      color: availableColor,
    };

    room.players.push(aiPlayer);
    room.lastActivityAt = Date.now();

    return { success: true, room: this.sanitizeRoom(room) };
  }

  // 移除玩家（房主操作）
  removePlayer(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
    if (room.hostId !== requesterId) return { success: false, error: 'NOT_HOST' };
    if (targetPlayerId === requesterId) return { success: false, error: 'CANNOT_REMOVE_SELF' };

    room.players = room.players.filter(p => p.id !== targetPlayerId);
    room.lastActivityAt = Date.now();

    return { success: true };
  }

  // 更新房间设置
  updateRoom(roomId: string, requesterId: string, updates: Partial<GameRoom>): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };
    if (room.hostId !== requesterId) return { success: false, error: 'NOT_HOST' };

    // 只允许更新特定字段
    if (updates.name) room.name = updates.name;
    if (updates.gameSettings) {
      room.gameSettings = { ...room.gameSettings, ...updates.gameSettings };
    }
    room.lastActivityAt = Date.now();

    return { success: true };
  }

  // 玩家准备状态切换
  setPlayerReady(roomId: string, playerId: string, isReady: boolean): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

    player.isReady = isReady;
    room.lastActivityAt = Date.now();

    return { success: true };
  }

  // 开始游戏前检查
  canStartGame(roomId: string, requesterId: string): { canStart: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { canStart: false, error: 'ROOM_NOT_FOUND' };
    if (room.hostId !== requesterId) return { canStart: false, error: 'NOT_HOST' };
    if (room.players.length !== 4) return { canStart: false, error: 'NEED_FOUR_PLAYERS' };
    if (room.status !== 'waiting') return { canStart: false, error: 'GAME_ALREADY_STARTED' };

    const allReady = room.players.every(p => p.isReady);
    if (!allReady) return { canStart: false, error: 'PLAYERS_NOT_READY' };

    return { canStart: true };
  }

  // 标记游戏已开始
  setGameStarted(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'playing';
      room.lastActivityAt = Date.now();
    }
  }

  // 标记游戏结束
  setGameFinished(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'finished';
      room.lastActivityAt = Date.now();
      // 30 秒后自动删除已结束的房间
      setTimeout(() => {
        const r = this.rooms.get(roomId);
        if (r && r.status === 'finished') {
          this.rooms.delete(roomId);
          console.log(`[RoomManager] Auto-deleted finished room ${roomId}`);
          if (this.onRoomDeleted) this.onRoomDeleted(roomId);
        }
      }, 30 * 1000);
    }
  }

  // 重置房间为等待状态（再来一局）
  resetRoom(roomId: string): GameRoom | undefined {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'waiting';
      room.players.forEach(p => {
        if (!p.isAI && !p.isHost) p.isReady = false;
      });
      room.lastActivityAt = Date.now();
      return this.sanitizeRoom(room);
    }
    return undefined;
  }

  // 清理过期房间
  private cleanupOldRooms(): void {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const toDelete: string[] = [];

    this.rooms.forEach((room, id) => {
      if (room.lastActivityAt < twoHoursAgo) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => this.rooms.delete(id));
    if (toDelete.length > 0) {
      console.log(`[RoomManager] Cleaned up ${toDelete.length} expired rooms`);
    }
  }

  // 移除密码信息的安全版本
  private sanitizeRoom(room: GameRoom): GameRoom {
    return {
      ...room,
      password: room.password ? '***' : undefined,
    };
  }

  // 统计
  getStats() {
    return {
      totalRooms: this.rooms.size,
      waitingRooms: Array.from(this.rooms.values()).filter(r => r.status === 'waiting').length,
      playingRooms: Array.from(this.rooms.values()).filter(r => r.status === 'playing').length,
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
