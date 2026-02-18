import { GameRoom, RoomPlayer, GameSettings } from '../types/game';
import SimpleCrossDeviceService from './simpleCrossDeviceService';

const PUBLIC_ROOMS: GameRoom[] = []; // 现在使用SimpleCrossDeviceService管理房间

export class RoomService {
  private static instance: RoomService;
  private simpleCrossDeviceService: SimpleCrossDeviceService;

  private constructor() {
    this.simpleCrossDeviceService = SimpleCrossDeviceService.getInstance();
  }

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  public getRooms(): GameRoom[] {
    return this.simpleCrossDeviceService.getRooms();
  }

  public async createRoom(name: string, password?: string, settings?: Partial<GameSettings>, userId?: string): Promise<GameRoom> {
    try {
      const newRoom = await this.simpleCrossDeviceService.createRoom(name, password, settings, userId);
      return newRoom;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }

  public async joinRoom(roomId: string, userId: string, nickname: string): Promise<boolean> {
    try {
      return await this.simpleCrossDeviceService.joinRoom(roomId, userId, nickname);
    } catch (error) {
      console.error('加入房间失败:', error);
      return false;
    }
  }

  public async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      return await this.simpleCrossDeviceService.leaveRoom(roomId, userId);
    } catch (error) {
      console.error('离开房间失败:', error);
      return false;
    }
  }

  public async updateRoom(roomId: string, updates: Partial<GameRoom>): Promise<boolean> {
    try {
      return await this.simpleCrossDeviceService.updateRoom(roomId, updates);
    } catch (error) {
      console.error('更新房间失败:', error);
      return false;
    }
  }

  public addListener(listener: (rooms: GameRoom[]) => void): () => void {
    return this.simpleCrossDeviceService.addListener(listener);
  }

  public async refreshRooms(): Promise<void> {
    try {
      await this.simpleCrossDeviceService.refreshRooms();
    } catch (error) {
      console.error('刷新房间列表失败:', error);
    }
  }

  public isConnected(): boolean {
    return this.simpleCrossDeviceService.isConnected();
  }
}

export default RoomService;
