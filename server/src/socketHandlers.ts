import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { GameManager } from './gameManager';
import { verifyToken, verifyFirebaseToken, generateToken, generateTokenForFirebaseUser } from './auth';
import { ServerToClientEvents, ClientToServerEvents, TokenPayload } from './types';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// 扩展 Socket，附带用户信息
interface AuthenticatedSocket extends TypedSocket {
  data: {
    userId?: string;
    nickname?: string;
    currentRoomId?: string;
  };
}

export function setupSocketHandlers(
  io: TypedServer,
  roomManager: RoomManager,
  gameManager: GameManager
) {
  // 已结束房间自动删除时，广播通知客户端
  roomManager.onRoomDeleted = (roomId: string) => {
    io.emit('room:deleted', roomId);
    io.emit('room:list', roomManager.getPublicRooms());
    gameManager.removeGame(roomId);
  };
  roomManager.onRoomUpdated = (roomId: string) => {
    const room = roomManager.getRoomSafe(roomId);
    if (room) {
      io.to(roomId).emit('room:updated', room);
    }
    io.emit('room:list', roomManager.getPublicRooms());
  };

  // Socket.io 中间件：认证（支持 local JWT 和 Firebase ID token）
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      // Try local JWT first
      const payload = verifyToken(token);
      if (payload) {
        socket.data.userId = payload.userId;
        socket.data.nickname = payload.nickname;
        return next();
      }

      // Then try Firebase ID token
      const fbDecoded = await verifyFirebaseToken(token);
      if (fbDecoded) {
        socket.data.userId = `fb_${fbDecoded.uid}`;
        socket.data.nickname = fbDecoded.name || fbDecoded.email?.split('@')[0] || 'Player';
        return next();
      }
    }
    next();
  });

  io.on('connection', (rawSocket: TypedSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.data.userId || 'anonymous'})`);

    if (socket.data.userId) {
      socket.emit('authenticated', { userId: socket.data.userId, nickname: socket.data.nickname || '' });
    }

    // ===================== 认证 =====================
    socket.on('auth:login', async (data, callback) => {
      try {
        if (!data?.nickname || data.nickname.trim().length === 0) {
          return callback({ success: false, error: 'NICKNAME_REQUIRED' });
        }
        const nickname = data.nickname.trim().substring(0, 20);
        if (nickname.length < 1) {
          return callback({ success: false, error: 'NICKNAME_REQUIRED' });
        }

        // If the socket already has a Firebase-linked userId, issue a token tied to that uid
        if (socket.data.userId?.startsWith('fb_')) {
          const fbUid = socket.data.userId.replace('fb_', '');
          const { token, userId } = generateTokenForFirebaseUser(fbUid, nickname, data.avatar);
          socket.data.userId = userId;
          socket.data.nickname = nickname;
          socket.emit('authenticated', { userId, nickname });
          callback({ success: true, token, userId });
          console.log(`[Auth] Firebase user logged in: ${nickname} (${userId})`);
          return;
        }

        // Guest / legacy login
        const { token, userId } = generateToken(nickname, data.avatar);
        socket.data.userId = userId;
        socket.data.nickname = nickname;

        socket.emit('authenticated', { userId, nickname });
        callback({ success: true, token, userId });
        console.log(`[Auth] Guest logged in: ${nickname} (${userId})`);
      } catch (err) {
        console.error('[Auth] Login error:', err);
        callback({ success: false, error: 'LOGIN_FAILED' });
      }
    });

    // ===================== 房间操作 =====================

    // 获取房间列表
    socket.on('room:list', (callback) => {
      callback(roomManager.getPublicRooms());
    });

    // 创建房间
    socket.on('room:create', (data, callback) => {
      if (!socket.data.userId || !socket.data.nickname) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const roomName = (data.name || '').trim().substring(0, 30) || 'Game Room';
      const roomPassword = data.password ? String(data.password).substring(0, 20) : undefined;

      try {
        const room = roomManager.createRoom(
          socket.data.userId,
          socket.data.nickname,
          roomName,
          roomPassword,
          data.settings,
          data.gameMode,
        );

        if (!room) {
           // 理论上 createRoom 会抛出异常，这里作为防御性编程
           return callback({ success: false, error: 'CREATE_FAILED' });
        }

        // 加入 Socket.io 房间
        socket.join(room.id);
        socket.data.currentRoomId = room.id;

        callback({ success: true, room });

        // 广播更新给所有人
        io.emit('room:list', roomManager.getPublicRooms());
        console.log(`[Room] Created: ${room.id} by ${socket.data.nickname}`);
      } catch (error: any) {
        if (error.message && error.message.startsWith('ALREADY_IN_ROOM')) {
           return callback({ success: false, error: error.message });
        }
        callback({ success: false, error: 'CREATE_FAILED' });
      }
    });

    // 加入房间
    socket.on('room:join', (data, callback) => {
      if (!socket.data.userId || !socket.data.nickname) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.joinRoom(data.roomId, socket.data.userId, socket.data.nickname, data.password);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      socket.join(data.roomId);
      socket.data.currentRoomId = data.roomId;

      callback({ success: true, room: result.room });

      // 重连：恢复游戏（单机恢复/多人移除托管 AI），广播玩家上线，并立即发送游戏状态
      if (result.isRejoin && result.room?.status === 'playing') {
        const isSingle = roomManager.isSinglePlayerRoom(data.roomId);
        gameManager.setPlayerOnline(data.roomId, socket.data.userId, isSingle);
        io.to(data.roomId).emit('room:playerOnline', { roomId: data.roomId, playerId: socket.data.userId });
        if (isSingle) {
          io.to(data.roomId).emit('game:resumed', { roomId: data.roomId });
        }
        // 立即发送当前游戏状态给重连玩家
        const state = gameManager.getGameState(data.roomId);
        const playerColors = gameManager.getPlayerColorMap(data.roomId);
        const names = gameManager.getPlayerNameMap(data.roomId);
        if (state && playerColors) {
          socket.emit('game:state', {
            roomId: data.roomId,
            gameState: state,
            playerColors,
            playerNames: names || {},
            isPaused: gameManager.isGamePaused(data.roomId),
          });
        }
      } else if (!result.isRejoin) {
        socket.to(data.roomId).emit('room:playerJoined', {
          roomId: data.roomId,
          player: {
            id: socket.data.userId,
            nickname: socket.data.nickname,
            isHost: false,
            isAI: false,
            isReady: false,
          },
        });
      }

      if (result.room) {
        io.to(data.roomId).emit('room:updated', result.room);
      }
      io.emit('room:list', roomManager.getPublicRooms());
      console.log(`[Room] ${socket.data.nickname} ${result.isRejoin ? 'rejoined' : 'joined'} ${data.roomId}`);
    });

    // 离开房间
    socket.on('room:leave', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const room = roomManager.getRoomSafe(data.roomId);
      const isPlaying = room?.status === 'playing';
      const isSpectator = roomManager.isSpectator(data.roomId, socket.data.userId);

      // 游戏进行中且为玩家：视为临时离开，不结算、不移除，允许稍后回到游戏
      if (!isSpectator && isPlaying) {
        const isSingle = roomManager.isSinglePlayerRoom(data.roomId);
        roomManager.setPlayerOffline(data.roomId, socket.data.userId);
        gameManager.setPlayerOffline(data.roomId, socket.data.userId, isSingle);
        const result = roomManager.leaveRoom(data.roomId, socket.data.userId, true);
        if (!result.success) {
          return callback({ success: false, error: 'LEAVE_FAILED' });
        }
        socket.leave(data.roomId);
        socket.data.currentRoomId = undefined;
        callback({ success: true });
        io.to(data.roomId).emit('room:playerOffline', { roomId: data.roomId, playerId: socket.data.userId });
        if (isSingle) {
          io.to(data.roomId).emit('game:paused', { roomId: data.roomId, reason: 'player_disconnected' });
        }
        io.emit('room:list', roomManager.getPublicRooms());
        const updated = roomManager.getRoomSafe(data.roomId);
        if (updated) io.to(data.roomId).emit('room:updated', updated);
        console.log(`[Room] ${socket.data.nickname} temporarily left ${data.roomId} (game in progress, can rejoin)`);
        return;
      }

      // 观战者或非游戏中：正常离开
      if (!isSpectator) {
        handleGameDisconnect(data.roomId, socket.data.userId);
      }
      const result = roomManager.leaveRoom(data.roomId, socket.data.userId, false);
      if (!result.success) {
        return callback({ success: false, error: 'LEAVE_FAILED' });
      }

      socket.leave(data.roomId);
      socket.data.currentRoomId = undefined;

      callback({ success: true });

      if (result.deleted) {
        gameManager.removeGame(data.roomId);
        io.emit('room:deleted', data.roomId);
        console.log(`[Room] Auto-destroyed room ${data.roomId} (all human players left)`);
      } else {
        const updatedRoom = roomManager.getRoomSafe(data.roomId);
        const playerWasRemoved = !updatedRoom?.players.some(p => p.id === socket.data.userId);
        if (playerWasRemoved) {
          socket.to(data.roomId).emit('room:playerLeft', {
            roomId: data.roomId,
            playerId: socket.data.userId,
          });
        }
        if (updatedRoom) {
          io.to(data.roomId).emit('room:updated', updatedRoom);
        }
      }

      io.emit('room:list', roomManager.getPublicRooms());
      console.log(`[Room] ${socket.data.nickname} left ${data.roomId}`);
    });

    // 更新房间设置
    socket.on('room:update', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.updateRoom(data.roomId, socket.data.userId, data.updates);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });

      const updatedRoom = roomManager.getRoomSafe(data.roomId);
      if (updatedRoom) {
        io.to(data.roomId).emit('room:updated', updatedRoom);
      }
      io.emit('room:list', roomManager.getPublicRooms());
    });

    // 添加 AI 玩家
    socket.on('room:addAI', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.addAI(data.roomId, socket.data.userId, data.aiDifficulty);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });

      if (result.room) {
        io.to(data.roomId).emit('room:updated', result.room);
      }
      io.emit('room:list', roomManager.getPublicRooms());
    });

    // 移除玩家
    socket.on('room:removePlayer', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.removePlayer(data.roomId, socket.data.userId, data.playerId);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });

      // 通知被移除的玩家
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        const as = s as AuthenticatedSocket;
        if (as.data.userId === data.playerId) {
          as.leave(data.roomId);
          as.data.currentRoomId = undefined;
          as.emit('room:playerLeft', { roomId: data.roomId, playerId: data.playerId });
        }
      });

      const updatedRoom = roomManager.getRoomSafe(data.roomId);
      if (updatedRoom) {
        io.to(data.roomId).emit('room:updated', updatedRoom);
      }
      io.emit('room:list', roomManager.getPublicRooms());
    });

    // 房间聊天
    socket.on('room:chat', (data) => {
      if (!socket.data.userId || !socket.data.nickname) return;

      io.to(data.roomId).emit('room:chat', {
        roomId: data.roomId,
        senderId: socket.data.userId,
        senderName: socket.data.nickname,
        content: data.content,
        timestamp: Date.now(),
        type: 'chat',
      });
    });

    // 切换准备状态
    socket.on('room:ready', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.setPlayerReady(data.roomId, socket.data.userId, data.isReady);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });

      const updatedRoom = roomManager.getRoomSafe(data.roomId);
      if (updatedRoom) {
        io.to(data.roomId).emit('room:updated', updatedRoom);
      }
    });

    // ===================== 游戏操作 =====================

    // 开始游戏
    socket.on('game:start', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const check = roomManager.canStartGame(data.roomId, socket.data.userId);
      if (!check.canStart) {
        return callback({ success: false, error: check.error });
      }

      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        return callback({ success: false, error: 'ROOM_NOT_FOUND' });
      }

      // 初始化游戏
      const { gameState, playerColors } = gameManager.startGame(
        data.roomId,
        room.players,
        room.gameSettings.turnTimeLimit,
        // 回合超时回调
        (roomId) => {
          // GameManager 已在超时处推进回合，这里只负责广播最新状态
          const state = gameManager.getGameState(roomId);
          if (!state) return;

          if (state.gamePhase === 'finished') {
            const rankings = gameManager.getRankings(roomId);
            if (rankings) {
              io.to(roomId).emit('game:finished', {
                roomId,
                gameState: state,
                rankings,
              });
              roomManager.setGameFinished(roomId);
            }
            return;
          }

          const turnTimeLimit = room?.gameSettings.turnTimeLimit || 60;
          io.to(roomId).emit('game:turnChanged', {
            roomId,
            currentPlayerIndex: state.currentPlayerIndex,
            timeLeft: turnTimeLimit,
          });
        },
        // 时间更新回调
        (roomId, timeLeft) => {
          io.to(roomId).emit('game:timeUpdate', { roomId, timeLeft });
        },
        // AI 移动回调
        (roomId, move, gameState) => {
          // 广播 AI 移动
          io.to(roomId).emit('game:move', {
            roomId,
            move,
            gameState,
          });

          // 广播回合切换
          if (gameState.gamePhase === 'playing') {
            const room = roomManager.getRoom(roomId);
            io.to(roomId).emit('game:turnChanged', {
              roomId,
              currentPlayerIndex: gameState.currentPlayerIndex,
              timeLeft: room?.gameSettings.turnTimeLimit || 60,
            });
          }

          // 检查游戏是否结束
          if (gameState.gamePhase === 'finished') {
            const rankings = gameManager.getRankings(roomId);
            if (rankings) {
              io.to(roomId).emit('game:finished', {
                roomId,
                gameState,
                rankings,
              });
              roomManager.setGameFinished(roomId);
            }
          }
        },
        // AI 结算回调
        (roomId, playerId) => {
          io.to(roomId).emit('game:playerSettled', {
            roomId,
            playerId,
          });

          // 检查游戏是否结束
          const state = gameManager.getGameState(roomId);
          if (state?.gamePhase === 'finished') {
             const rankings = gameManager.getRankings(roomId);
             if (rankings) {
               io.to(roomId).emit('game:finished', {
                 roomId,
                 gameState: state,
                 rankings,
               });
               roomManager.setGameFinished(roomId);
             }
          } else if (state?.gamePhase === 'playing') {
             // 广播回合切换
             const room = roomManager.getRoom(roomId);
             io.to(roomId).emit('game:turnChanged', {
               roomId,
               currentPlayerIndex: state.currentPlayerIndex,
               timeLeft: room?.gameSettings.turnTimeLimit || 60,
             });
          }
        },
        room.gameMode || 'classic',
      );

      roomManager.setGameStarted(data.roomId);

      callback({ success: true });

      // 广播游戏开始
      const playerNames = gameManager.getPlayerNameMap(data.roomId);
      io.to(data.roomId).emit('game:started', {
        roomId: data.roomId,
        gameState,
        playerColors,
        playerNames: playerNames || {},
      });

      io.emit('room:list', roomManager.getPublicRooms());
      console.log(`[Game] Started in room ${data.roomId}`);
    });

    // 观战
    socket.on('game:spectate', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = roomManager.addSpectator(data.roomId, socket.data.userId);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      // 加入 Socket.io 房间以接收游戏事件广播
      socket.join(data.roomId);
      socket.data.currentRoomId = data.roomId;

      callback({ success: true });

      // 发送当前游戏状态给观战者
      const state = gameManager.getGameState(data.roomId);
      const playerColors = gameManager.getPlayerColorMap(data.roomId);
      const spectateNames = gameManager.getPlayerNameMap(data.roomId);
      if (state && playerColors) {
        socket.emit('game:state', {
          roomId: data.roomId,
          gameState: state,
          playerColors,
          playerNames: spectateNames || {},
          isPaused: gameManager.isGamePaused(data.roomId),
        });
      }

      // 通知房间内有人来观战
      const updatedRoom = roomManager.getRoomSafe(data.roomId);
      if (updatedRoom) {
        io.to(data.roomId).emit('room:updated', updatedRoom);
      }

      console.log(`[Spectate] ${socket.data.nickname} is spectating room ${data.roomId}`);
    });

    // 获取游戏状态
    socket.on('game:getState', (data) => {
      if (!socket.data.userId) return;

      const state = gameManager.getGameState(data.roomId);
      const playerColors = gameManager.getPlayerColorMap(data.roomId);
      const names = gameManager.getPlayerNameMap(data.roomId);

      if (state && playerColors) {
        socket.emit('game:state', {
          roomId: data.roomId,
          gameState: state,
          playerColors,
          playerNames: names || {},
          isPaused: gameManager.isGamePaused(data.roomId),
        });
      }
    });

    // 玩家落子
    socket.on('game:move', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = gameManager.processMove(data.roomId, socket.data.userId, data.move);
      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });

      // 广播落子给房间内所有人
      io.to(data.roomId).emit('game:move', {
        roomId: data.roomId,
        move: data.move,
        gameState: result.gameState!,
      });

      // 广播回合切换
      if (result.gameState!.gamePhase === 'playing') {
        const room = roomManager.getRoom(data.roomId);
        io.to(data.roomId).emit('game:turnChanged', {
          roomId: data.roomId,
          currentPlayerIndex: result.gameState!.currentPlayerIndex,
          timeLeft: room?.gameSettings.turnTimeLimit || 60,
        });
      }

      // 检查游戏是否结束
      if (result.gameState!.gamePhase === 'finished') {
        const rankings = gameManager.getRankings(data.roomId);
        if (rankings) {
          io.to(data.roomId).emit('game:finished', {
            roomId: data.roomId,
            gameState: result.gameState!,
            rankings,
          });
          roomManager.setGameFinished(data.roomId);
        }
      }
    });

    // 创意模式：使用道具卡
    socket.on('game:useItemCard', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = gameManager.useItemCard(
        data.roomId,
        socket.data.userId,
        data.cardIndex,
        data.targetPlayerId
      );

      if (!result.success) {
        return callback({ success: false, error: result.error });
      }

      callback({ success: true });
      io.to(data.roomId).emit('game:itemUsed', {
        roomId: data.roomId,
        gameState: result.gameState!,
        pieceIdUnused: result.pieceIdUnused,
        pieceIdRemoved: result.pieceIdRemoved,
        targetPlayerId: result.targetPlayerId,
      });
    });

    // 玩家结算
    socket.on('game:settle', (data, callback) => {
      if (!socket.data.userId) {
        return callback({ success: false, error: 'NOT_AUTHENTICATED' });
      }

      const result = gameManager.settlePlayer(data.roomId, socket.data.userId);
      if (!result.success) {
        return callback({ success: false, error: 'SETTLE_FAILED' });
      }

      callback({ success: true });

      // 广播结算
      io.to(data.roomId).emit('game:playerSettled', {
        roomId: data.roomId,
        playerId: socket.data.userId,
      });

      // 游戏结束
      if (result.isGameOver) {
        const rankings = gameManager.getRankings(data.roomId);
        if (rankings && result.gameState) {
          io.to(data.roomId).emit('game:finished', {
            roomId: data.roomId,
            gameState: result.gameState,
            rankings,
          });
          roomManager.setGameFinished(data.roomId);
        }
      } else if (result.gameState?.gamePhase === 'playing') {
        // 通知回合切换
        const room = roomManager.getRoom(data.roomId);
        io.to(data.roomId).emit('game:turnChanged', {
          roomId: data.roomId,
          currentPlayerIndex: result.gameState.currentPlayerIndex,
          timeLeft: room?.gameSettings.turnTimeLimit || 60,
        });
      }
    });

    // ===================== 断线处理 =====================
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id} (user: ${socket.data.userId || 'anonymous'})`);

      if (socket.data.userId && socket.data.currentRoomId) {
        const roomId = socket.data.currentRoomId;
        const userId = socket.data.userId;

        // 先检查是否是观战者
        if (roomManager.isSpectator(roomId, userId)) {
          roomManager.removeSpectator(roomId, userId);
          const updatedRoom = roomManager.getRoomSafe(roomId);
          if (updatedRoom) {
            io.to(roomId).emit('room:updated', updatedRoom);
          }
        } else {
          // 是玩家：不自动结算，保留玩家以便重连；单机暂停，多人托管 AI
          const room = roomManager.getRoom(roomId);
          const isPlaying = room?.status === 'playing';
          if (isPlaying) {
            const isSingle = roomManager.isSinglePlayerRoom(roomId);
            roomManager.setPlayerOffline(roomId, userId);
            gameManager.setPlayerOffline(roomId, userId, isSingle);
          }
          const result = roomManager.leaveRoom(roomId, userId, true);
          
          if (result.deleted) {
            gameManager.removeGame(roomId);
            io.emit('room:deleted', roomId);
            console.log(`[Room] Auto-destroyed room ${roomId} (all human players left)`);
          } else {
            const updatedRoom = roomManager.getRoomSafe(roomId);
            if (updatedRoom) {
              const playerStillInRoom = updatedRoom.players.some(p => p.id === userId);
              if (!playerStillInRoom) {
                io.to(roomId).emit('room:playerLeft', { roomId, playerId: userId });
              } else if (isPlaying) {
                io.to(roomId).emit('room:playerOffline', { roomId, playerId: userId });
                io.to(roomId).emit('room:updated', updatedRoom);
                const isSingle = roomManager.isSinglePlayerRoom(roomId);
                if (isSingle) {
                  io.to(roomId).emit('game:paused', { roomId, reason: 'player_disconnected' });
                }
              } else {
                io.to(roomId).emit('room:updated', updatedRoom);
              }
            }
          }
        }

        io.emit('room:list', roomManager.getPublicRooms());
      }
    });

    // 断线时处理游戏逻辑
    function handleGameDisconnect(roomId: string, userId: string) {
      const { shouldSettle } = gameManager.handleDisconnect(roomId, userId);
      if (shouldSettle) {
        const result = gameManager.settlePlayer(roomId, userId);
        if (result.success) {
          io.to(roomId).emit('game:playerSettled', { roomId, playerId: userId });

          if (result.isGameOver) {
            const rankings = gameManager.getRankings(roomId);
            if (rankings && result.gameState) {
              io.to(roomId).emit('game:finished', {
                roomId,
                gameState: result.gameState,
                rankings,
              });
              roomManager.setGameFinished(roomId);
            }
          }
        }
      }
    }
  });
}
