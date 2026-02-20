import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GameRoom, RoomPlayer, GameSettings, GameMode } from '../types/game';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';

interface RoomContextType {
  rooms: GameRoom[];
  currentRoom: GameRoom | null;
  isLoading: boolean;
  isOnline: boolean;
  isSpectating: boolean;
  createRoom: (name: string, password?: string, settings?: Partial<GameSettings>, gameMode?: GameMode) => Promise<GameRoom>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  updateRoom: (roomId: string, updates: Partial<GameRoom>) => Promise<boolean>;
  addAI: (roomId: string, aiDifficulty: 'easy' | 'medium' | 'hard') => Promise<boolean>;
  removePlayer: (roomId: string, playerId: string) => Promise<boolean>;
  addPlayerToRoom: (roomId: string, player: RoomPlayer) => void;
  removePlayerFromRoom: (roomId: string, playerId: string) => void;
  updatePlayerInRoom: (roomId: string, playerId: string, updates: Partial<RoomPlayer>) => void;
  startGame: (roomId: string) => Promise<boolean>;
  setReady: (roomId: string, isReady: boolean) => Promise<boolean>;
  spectateGame: (roomId: string) => Promise<boolean>;
  refreshRooms: () => Promise<void>;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
}

export interface ChatMessage {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'system';
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

interface RoomProviderProps {
  children: ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // 监听 Socket 事件
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // 连接状态
    unsubscribers.push(
      socketService.on('connectionChange', (connected: boolean) => {
        setIsOnline(connected);
      })
    );

    // 房间列表更新
    unsubscribers.push(
      socketService.on('room:list', (roomList: GameRoom[]) => {
        setRooms(roomList);
      })
    );

    // 房间更新
    unsubscribers.push(
      socketService.on('room:updated', (room: GameRoom) => {
        setRooms(prev => prev.map(r => r.id === room.id ? room : r));
        setCurrentRoom(prev => prev?.id === room.id ? room : prev);
      })
    );

    // 房间删除
    unsubscribers.push(
      socketService.on('room:deleted', (roomId: string) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        if (currentRoom?.id === roomId) {
          setChatMessages([]); // 清空聊天记录
          setCurrentRoom(null);
        } else {
          setCurrentRoom(prev => prev?.id === roomId ? null : prev);
        }
      })
    );

    // 玩家加入
    unsubscribers.push(
      socketService.on('room:playerJoined', (data: { roomId: string; player: RoomPlayer }) => {
        setRooms(prev => prev.map(r => {
          if (r.id === data.roomId) {
            return { ...r, players: [...r.players, data.player] };
          }
          return r;
        }));
        setCurrentRoom(prev => {
          if (prev?.id === data.roomId) {
            return { ...prev, players: [...prev.players, data.player] };
          }
          return prev;
        });
      })
    );

    // 玩家离开
    unsubscribers.push(
      socketService.on('room:playerLeft', (data: { roomId: string; playerId: string }) => {
        setRooms(prev => prev.map(r => {
          if (r.id === data.roomId) {
            return { ...r, players: r.players.filter(p => p.id !== data.playerId) };
          }
          return r;
        }));
        setCurrentRoom(prev => {
          if (prev?.id === data.roomId) {
            // 如果自己被踢出
            if (user && data.playerId === user.profile.id) {
              return null;
            }
            // 确保更新后的 players 数组是新的引用
            const newPlayers = prev.players.filter(p => p.id !== data.playerId);
            return { ...prev, players: newPlayers };
          }
          return prev;
        });
      })
    );

    // 房间聊天
    unsubscribers.push(
      socketService.on('room:chat', (data: ChatMessage) => {
        setChatMessages(prev => [...prev, data]);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // 连接后自动获取房间列表
  useEffect(() => {
    if (isOnline && user) {
      refreshRooms();
    }
  }, [isOnline, user]);

  const createRoom = useCallback(async (name: string, password?: string, settings?: Partial<GameSettings>, gameMode?: GameMode): Promise<GameRoom> => {
    if (!user) throw new Error('用户未登录');

    const mode = gameMode || 'classic';

    if (socketService.isConnected) {
      const result = await socketService.createRoom(name, password, settings, mode);
      if (result.success && result.room) {
        setCurrentRoom(result.room);
        return result.room;
      }
      throw new Error(result.error || 'CREATE_FAILED');
    }

    // 离线降级：本地创建
    const localRoom: GameRoom = {
      id: `local_${Date.now()}`,
      name,
      password,
      hostId: user.profile.id,
      players: [{
        id: user.profile.id,
        nickname: user.profile.nickname,
        isHost: true,
        isAI: false,
        isReady: true,
      }],
      maxPlayers: 4,
      status: 'waiting',
      gameMode: mode,
      gameSettings: {
        boardSize: 20,
        turnTimeLimit: 60,
        aiDifficulty: 'medium',
        timeLimit: 300,
        showHints: true,
        soundEnabled: true,
        allowSpectators: true,
        privateRoom: !!password,
        ...settings,
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    setCurrentRoom(localRoom);
    return localRoom;
  }, [user]);

  const joinRoom = useCallback(async (roomId: string, password?: string): Promise<boolean> => {
    if (!user || !socketService.isConnected) return false;

    const result = await socketService.joinRoom(roomId, password);
    if (result.success && result.room) {
      setChatMessages([]); // 清空聊天记录
      setCurrentRoom(result.room);
      return true;
    }

    // 兜底恢复：如果服务端认为玩家仍在旧房间，先离开旧房间再重试一次
    if (result.error && result.error.startsWith('ALREADY_IN_ROOM')) {
      const staleRoomId = result.error.split(':')[1];
      if (staleRoomId) {
        try {
          await socketService.leaveRoom(staleRoomId);
          const retry = await socketService.joinRoom(roomId, password);
          if (retry.success && retry.room) {
            setChatMessages([]);
            setCurrentRoom(retry.room);
            return true;
          }
        } catch (error) {
          console.warn('Retry join room failed:', error);
        }
      }
    }
    return false;
  }, [user]);

  const leaveRoom = useCallback(async (): Promise<void> => {
    const roomToLeave = currentRoom || (user ? rooms.find(r => r.players.some(p => p.id === user.profile.id)) || null : null);

    // 先清本地状态，避免 UI 卡在加载态
    setCurrentRoom(null);
    setChatMessages([]);
    setIsSpectating(false);

    if (roomToLeave && socketService.isConnected) {
      try {
        await socketService.leaveRoom(roomToLeave.id);
      } catch (error) {
        console.warn('leaveRoom failed:', error);
      }
      try {
        const roomList = await socketService.getRooms();
        setRooms(roomList);
      } catch {
        // ignore refresh error
      }
    }
  }, [currentRoom, rooms, user]);

  const updateRoom = useCallback(async (roomId: string, updates: Partial<GameRoom>): Promise<boolean> => {
    if (socketService.isConnected) {
      const result = await socketService.updateRoom(roomId, updates);
      return result.success;
    }
    // 离线模式：直接更新本地
    setCurrentRoom(prev => prev?.id === roomId ? { ...prev, ...updates, lastActivityAt: Date.now() } : prev);
    return true;
  }, []);

  const addAI = useCallback(async (roomId: string, aiDifficulty: 'easy' | 'medium' | 'hard'): Promise<boolean> => {
    if (socketService.isConnected) {
      const result = await socketService.addAI(roomId, aiDifficulty);
      return result.success;
    }
    // 离线模式：本地添加AI
    const colors: Array<'red' | 'yellow' | 'blue' | 'green'> = ['red', 'yellow', 'blue', 'green'];
    setCurrentRoom(prev => {
      if (!prev || prev.id !== roomId || prev.players.length >= 4) return prev;
      const usedColors = prev.players.map(p => p.color);
      const availableColor = colors.find(c => !usedColors.includes(c));
      return {
        ...prev,
        players: [...prev.players, {
          id: `ai_${Date.now()}`,
          nickname: `AI (${aiDifficulty})`,
          isHost: false,
          isAI: true,
          aiDifficulty,
          isReady: true,
          color: availableColor,
        }],
      };
    });
    return true;
  }, []);

  const removePlayer = useCallback(async (roomId: string, playerId: string): Promise<boolean> => {
    if (socketService.isConnected) {
      const result = await socketService.removePlayer(roomId, playerId);
      return result.success;
    }
    setCurrentRoom(prev => {
      if (!prev || prev.id !== roomId) return prev;
      return { ...prev, players: prev.players.filter(p => p.id !== playerId) };
    });
    return true;
  }, []);

  const addPlayerToRoom = useCallback((roomId: string, player: RoomPlayer) => {
    setCurrentRoom(prev => {
      if (!prev || prev.id !== roomId) return prev;
      return { ...prev, players: [...prev.players, player] };
    });
  }, []);

  const removePlayerFromRoom = useCallback((roomId: string, playerId: string) => {
    setCurrentRoom(prev => {
      if (!prev || prev.id !== roomId) return prev;
      return { ...prev, players: prev.players.filter(p => p.id !== playerId) };
    });
  }, []);

  const updatePlayerInRoom = useCallback((roomId: string, playerId: string, updates: Partial<RoomPlayer>) => {
    setCurrentRoom(prev => {
      if (!prev || prev.id !== roomId) return prev;
      return {
        ...prev,
        players: prev.players.map(p => p.id === playerId ? { ...p, ...updates } : p),
      };
    });
  }, []);

  const startGame = useCallback(async (roomId: string): Promise<boolean> => {
    if (socketService.isConnected) {
      const result = await socketService.startGame(roomId);
      return result.success;
    }
    // 离线模式：直接更新状态
    setCurrentRoom(prev => prev?.id === roomId ? { ...prev, status: 'playing' } : prev);
    return true;
  }, []);

  const setReady = useCallback(async (roomId: string, isReady: boolean): Promise<boolean> => {
    if (socketService.isConnected) {
      const result = await socketService.setReady(roomId, isReady);
      return result.success;
    }
    return true;
  }, []);

  const spectateGame = useCallback(async (roomId: string): Promise<boolean> => {
    if (!user || !socketService.isConnected) return false;

    const result = await socketService.spectateGame(roomId);
    if (result.success) {
      // 获取房间信息作为 currentRoom
      const roomList = await socketService.getRooms();
      const room = roomList.find((r: GameRoom) => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
      }
      setIsSpectating(true);
      return true;
    }
    return false;
  }, [user]);

  const sendChatMessage = useCallback((content: string) => {
    if (currentRoom && socketService.isConnected) {
      socketService.sendChat(currentRoom.id, content);
    }
  }, [currentRoom]);

  const refreshRooms = useCallback(async () => {
    if (!socketService.isConnected) return;
    setIsLoading(true);
    try {
      const roomList = await socketService.getRooms();
      setRooms(roomList);
    } catch (error) {
      console.error('Failed to refresh rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: RoomContextType = {
    rooms,
    currentRoom,
    isLoading,
    isOnline,
    isSpectating,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoom,
    addAI,
    removePlayer,
    addPlayerToRoom,
    removePlayerFromRoom,
    updatePlayerInRoom,
    startGame,
    setReady,
    spectateGame,
    refreshRooms,
    chatMessages,
    sendChatMessage,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};
