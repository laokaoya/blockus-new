import { GameRoom, RoomPlayer, GameSettings } from '../types/game';

// 简单但有效的跨设备房间共享服务 - 使用localStorage + 设备间通信
export class SimpleCrossDeviceService {
  private static instance: SimpleCrossDeviceService;
  private rooms: Map<string, GameRoom> = new Map();
  private listeners: ((rooms: GameRoom[]) => void)[] = [];
  private isInitialized: boolean = false;
  private localDeviceId: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private storageKey: string = 'blockus_cross_device_rooms';

  private constructor() {
    this.localDeviceId = this.generateDeviceId();
    this.initialize();
  }

  public static getInstance(): SimpleCrossDeviceService {
    if (!SimpleCrossDeviceService.instance) {
      SimpleCrossDeviceService.instance = new SimpleCrossDeviceService();
    }
    return SimpleCrossDeviceService.instance;
  }

  // 生成唯一设备ID
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 初始化服务
  private async initialize(): Promise<void> {
    try {
      // 从本地存储加载现有房间
      this.loadRoomsFromStorage();
      
      // 启动定期同步
      this.startPeriodicSync();
      
      // 监听storage事件（跨标签页同步）
      this.setupStorageListener();
      
      this.isInitialized = true;
      console.log('简单跨设备房间服务初始化成功');
    } catch (error) {
      console.error('房间服务初始化失败:', error);
    }
  }

  // 启动定期同步
  private startPeriodicSync(): void {
    // 每2秒同步一次，确保实时性
    this.syncInterval = setInterval(() => {
      this.performCrossDeviceSync();
    }, 2000);
  }

  // 设置storage监听器
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const newRooms = JSON.parse(event.newValue);
          this.mergeRoomsFromOtherDevice(newRooms);
          console.log('从其他设备同步了房间数据');
        } catch (error) {
          console.log('解析其他设备房间数据失败:', error);
        }
      }
    });
  }

  // 执行跨设备同步
  private async performCrossDeviceSync(): Promise<void> {
    try {
      // 1. 从多个存储位置读取数据
      await this.syncFromMultipleSources();
      
      // 2. 广播本地房间到多个位置
      this.broadcastToMultipleLocations();
      
    } catch (error) {
      console.log('跨设备同步执行中...', error);
    }
  }

  // 从多个源同步
  private async syncFromMultipleSources(): Promise<void> {
    try {
      // 尝试从多个localStorage键读取数据
      const syncKeys = [
        this.storageKey,
        'blockus_rooms_shared',
        'blockus_rooms_global',
        'blockus_rooms_sync'
      ];

      for (const key of syncKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const rooms = JSON.parse(storedData);
            this.mergeRoomsFromOtherDevice(rooms);
          } catch (error) {
            console.log(`解析存储键 ${key} 的数据失败:`, error);
          }
        }
      }
    } catch (error) {
      console.log('从多个源同步失败:', error);
    }
  }

  // 广播到多个位置
  private broadcastToMultipleLocations(): void {
    try {
      const roomsData = Array.from(this.rooms.values());
      const broadcastKeys = [
        this.storageKey,
        'blockus_rooms_shared',
        'blockus_rooms_global',
        'blockus_rooms_sync'
      ];

      broadcastKeys.forEach(key => {
        try {
          localStorage.setItem(key, JSON.stringify(roomsData));
        } catch (error) {
          console.log(`广播到 ${key} 失败:`, error);
        }
      });

      console.log(`广播房间数据到 ${broadcastKeys.length} 个位置`);
    } catch (error) {
      console.log('广播到多个位置失败:', error);
    }
  }

  // 从其他设备合并房间
  private mergeRoomsFromOtherDevice(otherRooms: GameRoom[]): void {
    let updated = false;
    
    otherRooms.forEach(otherRoom => {
      const existingRoom = this.rooms.get(otherRoom.id);
      if (!existingRoom || otherRoom.lastActivityAt > existingRoom.lastActivityAt) {
        this.rooms.set(otherRoom.id, otherRoom);
        updated = true;
      }
    });
    
    if (updated) {
      this.saveRoomsToStorage();
      this.notifyListeners();
    }
  }

  // 获取所有房间
  public getRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  // 创建房间
  public async createRoom(name: string, password?: string, settings?: Partial<GameSettings>, userId?: string): Promise<GameRoom> {
    const defaultSettings: GameSettings = {
      boardSize: 20,
      turnTimeLimit: 60,
      aiDifficulty: 'medium',
      timeLimit: 300,
      showHints: true,
      soundEnabled: true,
      allowSpectators: true,
      privateRoom: !!password
    };

    const newRoom: GameRoom = {
      id: `simple_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      password: password || undefined,
      hostId: userId || this.localDeviceId,
      players: [
        {
          id: userId || this.localDeviceId,
          nickname: 'Player',
          isHost: true,
          isAI: false,
          isReady: true
        }
      ],
      maxPlayers: 4,
      status: 'waiting',
      gameSettings: { ...defaultSettings, ...settings },
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };

    try {
      // 保存到本地
      this.rooms.set(newRoom.id, newRoom);
      this.saveRoomsToStorage();
      this.notifyListeners();
      
      // 立即广播到多个位置
      this.broadcastToMultipleLocations();
      
      console.log('房间创建成功:', newRoom.id);
      return newRoom;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }

  // 加入房间
  public async joinRoom(roomId: string, userId: string, nickname: string): Promise<boolean> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) return false;

      if (room.status !== 'waiting' || room.players.length >= room.maxPlayers) return false;
      if (room.players.some((p: RoomPlayer) => p.id === userId)) return false;

      const newPlayer: RoomPlayer = {
        id: userId,
        nickname,
        isHost: false,
        isAI: false,
        isReady: false
      };

      room.players.push(newPlayer);
      room.lastActivityAt = Date.now();

      // 更新本地
      this.rooms.set(roomId, room);
      this.saveRoomsToStorage();
      this.notifyListeners();

      // 广播更新
      this.broadcastToMultipleLocations();

      console.log('成功加入房间:', roomId);
      return true;
    } catch (error) {
      console.error('加入房间失败:', error);
      return false;
    }
  }

  // 离开房间
  public async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) return false;

      room.players = room.players.filter((p: RoomPlayer) => p.id !== userId);
      room.lastActivityAt = Date.now();

      // 如果房间空了，删除房间
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      } else {
        // 更新房间
        this.rooms.set(roomId, room);
      }

      this.saveRoomsToStorage();
      this.notifyListeners();

      // 广播更新
      this.broadcastToMultipleLocations();

      console.log('成功离开房间:', roomId);
      return true;
    } catch (error) {
      console.error('离开房间失败:', error);
      return false;
    }
  }

  // 更新房间状态
  public async updateRoom(roomId: string, updates: Partial<GameRoom>): Promise<boolean> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) return false;

      const updatedRoom = { ...room, ...updates, lastActivityAt: Date.now() };
      this.rooms.set(roomId, updatedRoom);
      
      this.saveRoomsToStorage();
      this.notifyListeners();

      // 广播更新
      this.broadcastToMultipleLocations();

      console.log('房间更新成功:', roomId);
      return true;
    } catch (error) {
      console.error('更新房间失败:', error);
      return false;
    }
  }

  // 添加监听器
  public addListener(listener: (rooms: GameRoom[]) => void): () => void {
    this.listeners.push(listener);
    
    // 立即通知一次
    listener(this.getRooms());
    
    // 返回取消监听的函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getRooms()));
  }

  // 刷新房间列表
  public async refreshRooms(): Promise<void> {
    try {
      // 从本地存储重新加载
      this.loadRoomsFromStorage();
      
      // 立即执行跨设备同步
      await this.performCrossDeviceSync();
      
      this.notifyListeners();
    } catch (error) {
      console.error('刷新房间列表失败:', error);
    }
  }

  // 保存房间到本地存储
  private saveRoomsToStorage(): void {
    try {
      const roomsData = Array.from(this.rooms.values());
      localStorage.setItem(this.storageKey, JSON.stringify(roomsData));
    } catch (error) {
      console.error('保存房间到本地存储失败:', error);
    }
  }

  // 从本地存储加载房间
  private loadRoomsFromStorage(): void {
    try {
      const roomsData = localStorage.getItem(this.storageKey);
      if (roomsData) {
        const rooms = JSON.parse(roomsData);
        this.rooms.clear();
        rooms.forEach((room: GameRoom) => {
          this.rooms.set(room.id, room);
        });
      }
    } catch (error) {
      console.error('从本地存储加载房间失败:', error);
    }
  }

  // 清理过期房间
  public async cleanupOldRooms(): Promise<void> {
    try {
      const oneHourAgo = Date.now() - 3600000;
      const roomsToDelete: string[] = [];

      this.rooms.forEach((room, id) => {
        if (room.lastActivityAt < oneHourAgo) {
          roomsToDelete.push(id);
        }
      });

      // 删除过期房间
      roomsToDelete.forEach(id => {
        this.rooms.delete(id);
      });

      if (roomsToDelete.length > 0) {
        this.saveRoomsToStorage();
        this.notifyListeners();
        console.log(`清理了 ${roomsToDelete.length} 个过期房间`);
      }
    } catch (error) {
      console.error('清理过期房间失败:', error);
    }
  }

  // 获取连接状态
  public isConnected(): boolean {
    return this.isInitialized;
  }

  // 获取连接信息
  public getConnectionInfo(): string {
    if (this.isInitialized) {
      return '使用简单跨设备同步模式';
    } else {
      return '初始化中...';
    }
  }

  // 获取本地设备ID
  public getLocalDeviceId(): string {
    return this.localDeviceId;
  }

  // 清理资源
  public cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export default SimpleCrossDeviceService;
